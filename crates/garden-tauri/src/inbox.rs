//! The inbox folder, wired into the application.
//!
//! [`spawn_inbox_watcher`] starts a background task that looks at the inbox
//! folder every few seconds and imports what has arrived (see
//! [`garden_core::services::inbox`]). After an import it emits
//! [`INBOX_IMPORTED_EVENT`] so that the interface can refresh.
//!
//! PDF pages are rendered by `pdftoppm` from Poppler. Without it on `PATH`,
//! PDFs stay in the inbox and everything else still imports.

use std::path::{Path, PathBuf};
use std::time::Duration;

use async_trait::async_trait;
use garden_core::services::{InboxImporter, PageRasterizer};
use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager};
use tokio::process::Command;
use tracing::{info, warn};

use crate::state::AppState;

/// Event emitted after files were imported from the inbox.
pub const INBOX_IMPORTED_EVENT: &str = "inbox:imported";

/// Environment variable that overrides the inbox folder.
pub const INBOX_DIR_ENV: &str = "GARDEN_INBOX";

/// Name of the inbox folder inside the user's home folder.
const INBOX_DIRNAME: &str = "garden";

/// Time between two looks at the inbox. A file is imported once it has
/// stayed unchanged for this long.
const SCAN_INTERVAL: Duration = Duration::from_secs(3);

/// Resolution for PDF pages, in dots per inch.
const PDF_DPI: &str = "300";

/// Payload of [`INBOX_IMPORTED_EVENT`].
#[derive(Debug, Clone, Serialize)]
pub struct InboxImported {
    /// The inbox channel the blocks were added to.
    pub channel_id: String,
    /// Number of files imported.
    pub files: usize,
    /// Number of blocks created.
    pub blocks: usize,
}

/// Renders PDF pages with Poppler's `pdftoppm`.
pub struct PopplerRasterizer;

#[async_trait]
impl PageRasterizer for PopplerRasterizer {
    async fn rasterize(&self, pdf: &Path, out_dir: &Path) -> Result<Vec<PathBuf>, String> {
        // Writes page-1.jpg, page-2.jpg, …, zero-padded so that the names
        // sort in page order.
        let output = Command::new("pdftoppm")
            .args(["-r", PDF_DPI, "-jpeg", "-jpegopt", "quality=92"])
            .arg(pdf)
            .arg(out_dir.join("page"))
            .output()
            .await
            .map_err(|e| format!("could not run pdftoppm (is Poppler installed?): {e}"))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("pdftoppm failed: {}", stderr.trim()));
        }

        let mut pages = Vec::new();
        let mut entries = tokio::fs::read_dir(out_dir)
            .await
            .map_err(|e| e.to_string())?;
        while let Some(entry) = entries.next_entry().await.map_err(|e| e.to_string())? {
            pages.push(entry.path());
        }
        pages.sort();
        Ok(pages)
    }
}

/// The inbox folder: `$GARDEN_INBOX`, or `garden` in the user's home folder.
pub fn resolve_inbox_dir(app: &AppHandle) -> Option<PathBuf> {
    if let Some(dir) = std::env::var_os(INBOX_DIR_ENV).filter(|v| !v.is_empty()) {
        return Some(PathBuf::from(dir));
    }
    app.path()
        .home_dir()
        .ok()
        .map(|dir| dir.join(INBOX_DIRNAME))
}

/// Start watching the inbox folder in the background.
///
/// The folder is created if it does not exist. Failing to resolve or create
/// it is logged and leaves the rest of the application working.
pub fn spawn_inbox_watcher(app: &AppHandle, state: AppState) {
    let Some(dir) = resolve_inbox_dir(app) else {
        warn!("Inbox: could not resolve a folder; the inbox is off");
        return;
    };
    if let Err(e) = std::fs::create_dir_all(&dir) {
        warn!(path = %dir.display(), error = %e, "Inbox: could not create the folder; the inbox is off");
        return;
    }
    info!(path = %dir.display(), "Inbox: watching folder");

    let app = app.clone();
    tauri::async_runtime::spawn(async move {
        let mut importer = InboxImporter::new(dir, PopplerRasterizer);
        let mut ticker = tokio::time::interval(SCAN_INTERVAL);
        loop {
            ticker.tick().await;
            let report = importer.scan(state.service(), state.media_service()).await;
            let Some(channel_id) = report.channel_id else {
                continue;
            };
            let payload = InboxImported {
                channel_id: channel_id.0,
                files: report.files,
                blocks: report.blocks,
            };
            if let Err(e) = app.emit(INBOX_IMPORTED_EVENT, payload) {
                warn!(error = %e, "Inbox: could not notify the interface");
            }
        }
    });
}
