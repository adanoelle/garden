//! Inbox folder import.
//!
//! The inbox is an ordinary folder. Whatever lands in it (a scan, a saved
//! image, a PDF from a library scanner) is imported into the "Inbox"
//! channel, to be sorted into other channels later.
//!
//! [`InboxImporter::scan`] looks at the folder once. The caller decides how
//! often to call it.
//!
//! - A file is imported only after it has stayed the same for one whole
//!   interval between two scans, so a file that is still being written is
//!   left alone.
//! - Images, video and audio become one block each. A PDF becomes one image
//!   block per page, in page order.
//! - After a successful import the original moves to an `imported` folder
//!   inside the inbox. Nothing is deleted.
//! - A file that cannot be imported stays where it is and is not tried
//!   again until it changes.

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::time::SystemTime;

use async_trait::async_trait;
use tracing::{info, warn};
use uuid::Uuid;

use crate::error::DomainResult;
use crate::models::{Block, BlockId, ChannelId, NewBlock, NewChannel};
use crate::ports::{BlockRepository, ChannelRepository, ConnectionRepository};
use crate::services::{GardenService, MediaInfo, MediaService};

/// Title of the channel that receives imported files.
pub const INBOX_CHANNEL_TITLE: &str = "Inbox";

/// Folder inside the inbox that originals move to once imported.
pub const IMPORTED_DIRNAME: &str = "imported";

const INBOX_CHANNEL_DESCRIPTION: &str = "Files dropped into the inbox folder land here.";

/// Image formats the app can display.
const IMAGE_MIME_TYPES: &[&str] = &["image/jpeg", "image/png", "image/gif", "image/webp"];

/// Extensions browsers and scanners give a file while it is still arriving.
const PARTIAL_EXTENSIONS: &[&str] = &["part", "tmp", "crdownload", "download"];

/// Turns the pages of a PDF into image files.
///
/// The core does not know how pages are rendered; the application supplies
/// an implementation.
#[async_trait]
pub trait PageRasterizer: Send + Sync {
    /// Render every page of `pdf` to an image file inside `out_dir`.
    ///
    /// Returns the page files in page order. `out_dir` exists and is empty.
    async fn rasterize(&self, pdf: &Path, out_dir: &Path) -> Result<Vec<PathBuf>, String>;
}

/// What one scan of the inbox did.
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct InboxReport {
    /// The inbox channel, if anything was imported.
    pub channel_id: Option<ChannelId>,
    /// Number of files imported.
    pub files: usize,
    /// Number of blocks created. A PDF creates one per page.
    pub blocks: usize,
    /// Files that could not be imported, with the reason.
    pub failed: Vec<(PathBuf, String)>,
}

/// Size and modification time: enough to tell whether a file has changed.
#[derive(Debug, Clone, PartialEq, Eq)]
struct Fingerprint {
    len: u64,
    modified: Option<SystemTime>,
}

enum Kind {
    Media,
    Pdf,
    Unsupported,
}

fn classify(path: &Path) -> Kind {
    let Some(mime) = mime_guess::from_path(path).first() else {
        return Kind::Unsupported;
    };
    let mime = mime.essence_str();
    if mime == "application/pdf" {
        Kind::Pdf
    } else if IMAGE_MIME_TYPES.contains(&mime)
        || mime.starts_with("video/")
        || mime.starts_with("audio/")
    {
        Kind::Media
    } else {
        Kind::Unsupported
    }
}

/// Imports files from the inbox folder.
pub struct InboxImporter<R> {
    dir: PathBuf,
    rasterizer: R,
    /// Every file seen by the previous scan.
    seen: HashMap<PathBuf, Fingerprint>,
    /// Files that are left alone until they change.
    set_aside: HashMap<PathBuf, Fingerprint>,
}

impl<R: PageRasterizer> InboxImporter<R> {
    /// Create an importer for the folder `dir`.
    pub fn new(dir: impl Into<PathBuf>, rasterizer: R) -> Self {
        Self {
            dir: dir.into(),
            rasterizer,
            seen: HashMap::new(),
            set_aside: HashMap::new(),
        }
    }

    /// The inbox folder.
    pub fn dir(&self) -> &Path {
        &self.dir
    }

    /// Look at the inbox once and import every file that is ready.
    ///
    /// A missing or unreadable folder is not an error: the scan reports
    /// that it did nothing.
    pub async fn scan<CR, BR, CNR>(
        &mut self,
        service: &GardenService<CR, BR, CNR>,
        media: &MediaService,
    ) -> InboxReport
    where
        CR: ChannelRepository,
        BR: BlockRepository,
        CNR: ConnectionRepository,
    {
        let mut report = InboxReport::default();

        let current = self.list_files().await;
        let ready: Vec<(PathBuf, Fingerprint)> = current
            .iter()
            .filter(|(path, fingerprint)| {
                self.seen.get(path) == Some(fingerprint)
                    && self.set_aside.get(path) != Some(fingerprint)
            })
            .cloned()
            .collect();
        self.seen = current.into_iter().collect();
        self.set_aside
            .retain(|path, fingerprint| self.seen.get(path) == Some(fingerprint));

        for (path, fingerprint) in ready {
            let imported = match classify(&path) {
                Kind::Media => self.import_media(&path, media).await,
                Kind::Pdf => self.import_pdf(&path, media).await,
                Kind::Unsupported => {
                    info!(path = %path.display(), "Inbox: leaving a file of an unsupported type");
                    self.set_aside.insert(path, fingerprint);
                    continue;
                }
            };

            let stored = match imported {
                Ok(stored) => stored,
                Err(reason) => {
                    warn!(path = %path.display(), %reason, "Inbox: could not import file");
                    self.set_aside.insert(path.clone(), fingerprint);
                    report.failed.push((path, reason));
                    continue;
                }
            };

            match self.file_blocks(service, &stored).await {
                Ok((channel_id, blocks)) => {
                    report.channel_id = Some(channel_id);
                    report.files += 1;
                    report.blocks += blocks.len();
                    info!(
                        path = %path.display(),
                        blocks = blocks.len(),
                        "Inbox: imported file"
                    );
                }
                Err(e) => {
                    discard(media, &stored).await;
                    let reason = e.to_string();
                    warn!(path = %path.display(), %reason, "Inbox: could not create blocks");
                    self.set_aside.insert(path.clone(), fingerprint);
                    report.failed.push((path, reason));
                    continue;
                }
            }

            if let Err(e) = self.move_to_imported(&path).await {
                // The blocks exist. Set the file aside so that it is not
                // imported a second time on the next scan.
                warn!(
                    path = %path.display(),
                    error = %e,
                    "Inbox: imported, but could not move the original"
                );
                self.set_aside.insert(path, fingerprint);
            }
        }

        report
    }

    /// The files directly inside the inbox, sorted by name.
    async fn list_files(&self) -> Vec<(PathBuf, Fingerprint)> {
        let mut files = Vec::new();
        let Ok(mut entries) = tokio::fs::read_dir(&self.dir).await else {
            return files;
        };

        while let Ok(Some(entry)) = entries.next_entry().await {
            let path = entry.path();
            let Some(name) = path.file_name().and_then(|n| n.to_str()) else {
                continue;
            };
            if name.starts_with('.') {
                continue;
            }
            let partial = path
                .extension()
                .and_then(|e| e.to_str())
                .is_some_and(|e| PARTIAL_EXTENSIONS.contains(&e.to_ascii_lowercase().as_str()));
            if partial {
                continue;
            }
            let Ok(metadata) = entry.metadata().await else {
                continue;
            };
            if !metadata.is_file() {
                continue;
            }
            files.push((
                path,
                Fingerprint {
                    len: metadata.len(),
                    modified: metadata.modified().ok(),
                },
            ));
        }

        files.sort_by(|a, b| a.0.cmp(&b.0));
        files
    }

    async fn import_media(
        &self,
        path: &Path,
        media: &MediaService,
    ) -> Result<Vec<MediaInfo>, String> {
        media
            .import_from_file(path)
            .await
            .map(|info| vec![info])
            .map_err(|e| e.to_string())
    }

    async fn import_pdf(
        &self,
        path: &Path,
        media: &MediaService,
    ) -> Result<Vec<MediaInfo>, String> {
        // Hidden, so that a scan never mistakes the pages for new arrivals.
        let pages_dir = self.dir.join(format!(".pages-{}", Uuid::new_v4()));
        tokio::fs::create_dir_all(&pages_dir)
            .await
            .map_err(|e| e.to_string())?;

        let result = self.import_pages(path, &pages_dir, media).await;
        if let Err(e) = tokio::fs::remove_dir_all(&pages_dir).await {
            warn!(path = %pages_dir.display(), error = %e, "Inbox: could not remove page folder");
        }
        result
    }

    async fn import_pages(
        &self,
        pdf: &Path,
        pages_dir: &Path,
        media: &MediaService,
    ) -> Result<Vec<MediaInfo>, String> {
        let pages = self.rasterizer.rasterize(pdf, pages_dir).await?;
        if pages.is_empty() {
            return Err("the PDF has no pages".to_string());
        }

        let mut stored = Vec::with_capacity(pages.len());
        for page in &pages {
            match media.import_from_file(page).await {
                Ok(info) => stored.push(info),
                Err(e) => {
                    discard(media, &stored).await;
                    return Err(e.to_string());
                }
            }
        }
        Ok(stored)
    }

    /// Create one block per stored file and connect them to the inbox channel.
    async fn file_blocks<CR, BR, CNR>(
        &self,
        service: &GardenService<CR, BR, CNR>,
        stored: &[MediaInfo],
    ) -> DomainResult<(ChannelId, Vec<Block>)>
    where
        CR: ChannelRepository,
        BR: BlockRepository,
        CNR: ConnectionRepository,
    {
        let channel_id = inbox_channel(service).await?;
        let new_blocks = stored
            .iter()
            .cloned()
            .map(|info| NewBlock::new(info.into_block_content()))
            .collect();
        let blocks = service.create_blocks(new_blocks).await?;
        let ids: Vec<BlockId> = blocks.iter().map(|b| b.id.clone()).collect();
        service.connect_blocks(&ids, &channel_id, None).await?;
        Ok((channel_id, blocks))
    }

    /// Move an imported original into the `imported` folder.
    async fn move_to_imported(&self, path: &Path) -> std::io::Result<()> {
        let imported_dir = self.dir.join(IMPORTED_DIRNAME);
        tokio::fs::create_dir_all(&imported_dir).await?;

        let name = path.file_name().unwrap_or_default();
        let mut target = imported_dir.join(name);
        if tokio::fs::try_exists(&target).await.unwrap_or(false) {
            // Keep both: "scan.pdf" becomes "scan-<id>.pdf".
            let stem = path.file_stem().and_then(|s| s.to_str()).unwrap_or("file");
            let id = Uuid::new_v4().simple().to_string();
            let unique = match path.extension().and_then(|e| e.to_str()) {
                Some(ext) => format!("{stem}-{}.{ext}", &id[..8]),
                None => format!("{stem}-{}", &id[..8]),
            };
            target = imported_dir.join(unique);
        }
        tokio::fs::rename(path, &target).await
    }
}

/// Find the inbox channel, or create it.
async fn inbox_channel<CR, BR, CNR>(service: &GardenService<CR, BR, CNR>) -> DomainResult<ChannelId>
where
    CR: ChannelRepository,
    BR: BlockRepository,
    CNR: ConnectionRepository,
{
    const PAGE_SIZE: usize = 100;
    let mut offset = 0;
    loop {
        let page = service.list_channels(PAGE_SIZE, offset).await?;
        if let Some(channel) = page.items.iter().find(|c| c.title == INBOX_CHANNEL_TITLE) {
            return Ok(channel.id.clone());
        }
        offset += page.items.len();
        if page.items.is_empty() || offset >= page.total {
            break;
        }
    }

    let channel = service
        .create_channel(NewChannel {
            title: INBOX_CHANNEL_TITLE.to_string(),
            description: Some(INBOX_CHANNEL_DESCRIPTION.to_string()),
        })
        .await?;
    Ok(channel.id)
}

/// Remove stored media files that will not get a block after all.
async fn discard(media: &MediaService, stored: &[MediaInfo]) {
    for info in stored {
        if let Err(e) = media.delete(&info.file_path).await {
            warn!(path = %info.file_path, error = %e, "Inbox: could not remove stored file");
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::BlockContent;
    use crate::ports::{
        InMemoryBlockRepository, InMemoryChannelRepository, InMemoryConnectionRepository,
        TestFixture,
    };

    type TestService = GardenService<
        InMemoryChannelRepository,
        InMemoryBlockRepository,
        InMemoryConnectionRepository,
    >;

    /// Writes a fixed number of one-pixel PNG pages.
    struct FakeRasterizer {
        pages: usize,
    }

    #[async_trait]
    impl PageRasterizer for FakeRasterizer {
        async fn rasterize(&self, _pdf: &Path, out_dir: &Path) -> Result<Vec<PathBuf>, String> {
            let mut files = Vec::new();
            for n in 1..=self.pages {
                let path = out_dir.join(format!("page-{n}.png"));
                // The width records the page number, so tests can check order.
                write_png(&path, n as u32);
                files.push(path);
            }
            Ok(files)
        }
    }

    /// Always fails, as when no PDF tool is installed.
    struct BrokenRasterizer;

    #[async_trait]
    impl PageRasterizer for BrokenRasterizer {
        async fn rasterize(&self, _pdf: &Path, _out_dir: &Path) -> Result<Vec<PathBuf>, String> {
            Err("no PDF tool".to_string())
        }
    }

    fn write_png(path: &Path, width: u32) {
        image::RgbImage::new(width, 1).save(path).unwrap();
    }

    /// A scratch area holding an inbox folder and a media folder.
    struct Scratch {
        root: PathBuf,
    }

    impl Scratch {
        fn new() -> Self {
            let root = std::env::temp_dir().join(format!("garden-inbox-test-{}", Uuid::new_v4()));
            std::fs::create_dir_all(root.join("inbox")).unwrap();
            std::fs::create_dir_all(root.join("media")).unwrap();
            Self { root }
        }

        fn inbox(&self) -> PathBuf {
            self.root.join("inbox")
        }

        fn media(&self) -> MediaService {
            MediaService::new(self.root.join("media"))
        }
    }

    impl Drop for Scratch {
        fn drop(&mut self) {
            let _ = std::fs::remove_dir_all(&self.root);
        }
    }

    async fn inbox_blocks(service: &TestService) -> Vec<Block> {
        let page = service.list_channels(100, 0).await.unwrap();
        let Some(channel) = page.items.iter().find(|c| c.title == INBOX_CHANNEL_TITLE) else {
            return Vec::new();
        };
        service.get_blocks_in_channel(&channel.id).await.unwrap()
    }

    #[tokio::test]
    async fn imports_a_file_once_it_has_settled() {
        let scratch = Scratch::new();
        let service = TestFixture::new().service();
        let media = scratch.media();
        let mut importer = InboxImporter::new(scratch.inbox(), FakeRasterizer { pages: 0 });

        write_png(&scratch.inbox().join("leaf.png"), 3);

        // First sight: the file may still be arriving.
        let first = importer.scan(&service, &media).await;
        assert_eq!(first.blocks, 0);
        assert!(inbox_blocks(&service).await.is_empty());

        // Unchanged since the last scan: import it.
        let second = importer.scan(&service, &media).await;
        assert_eq!((second.files, second.blocks), (1, 1));
        assert!(second.channel_id.is_some());

        let blocks = inbox_blocks(&service).await;
        assert_eq!(blocks.len(), 1);
        assert!(matches!(
            blocks[0].content,
            BlockContent::Image { width: Some(3), .. }
        ));

        // The original moved; nothing is left to import.
        assert!(!scratch.inbox().join("leaf.png").exists());
        assert!(scratch
            .inbox()
            .join(IMPORTED_DIRNAME)
            .join("leaf.png")
            .exists());
        let third = importer.scan(&service, &media).await;
        assert_eq!(third, InboxReport::default());
    }

    #[tokio::test]
    async fn waits_while_a_file_is_still_changing() {
        let scratch = Scratch::new();
        let service = TestFixture::new().service();
        let media = scratch.media();
        let mut importer = InboxImporter::new(scratch.inbox(), FakeRasterizer { pages: 0 });
        let path = scratch.inbox().join("growing.png");

        write_png(&path, 1);
        importer.scan(&service, &media).await;

        // The file grew between scans, so it is not ready yet.
        write_png(&path, 200);
        let report = importer.scan(&service, &media).await;
        assert_eq!(report.blocks, 0);

        let report = importer.scan(&service, &media).await;
        assert_eq!(report.blocks, 1);
    }

    #[tokio::test]
    async fn a_pdf_becomes_one_block_per_page_in_order() {
        let scratch = Scratch::new();
        let service = TestFixture::new().service();
        let media = scratch.media();
        let mut importer = InboxImporter::new(scratch.inbox(), FakeRasterizer { pages: 3 });

        std::fs::write(scratch.inbox().join("scan.pdf"), b"%PDF-1.7").unwrap();
        importer.scan(&service, &media).await;
        let report = importer.scan(&service, &media).await;
        assert_eq!((report.files, report.blocks), (1, 3));

        let widths: Vec<Option<u32>> = inbox_blocks(&service)
            .await
            .iter()
            .map(|b| match &b.content {
                BlockContent::Image { width, .. } => *width,
                _ => None,
            })
            .collect();
        assert_eq!(widths, vec![Some(1), Some(2), Some(3)]);

        // The page folder is gone and the PDF has moved.
        let left: Vec<String> = std::fs::read_dir(scratch.inbox())
            .unwrap()
            .map(|e| e.unwrap().file_name().to_string_lossy().into_owned())
            .collect();
        assert_eq!(left, vec![IMPORTED_DIRNAME.to_string()]);
    }

    #[tokio::test]
    async fn a_file_that_fails_stays_and_is_not_retried() {
        let scratch = Scratch::new();
        let service = TestFixture::new().service();
        let media = scratch.media();
        let mut importer = InboxImporter::new(scratch.inbox(), BrokenRasterizer);
        let path = scratch.inbox().join("scan.pdf");

        std::fs::write(&path, b"%PDF-1.7").unwrap();
        importer.scan(&service, &media).await;
        let report = importer.scan(&service, &media).await;
        assert_eq!(report.blocks, 0);
        assert_eq!(report.failed.len(), 1);
        assert!(path.exists());

        // Still there, still unchanged: left alone.
        let report = importer.scan(&service, &media).await;
        assert_eq!(report, InboxReport::default());
        assert!(inbox_blocks(&service).await.is_empty());
    }

    #[tokio::test]
    async fn other_files_are_left_alone() {
        let scratch = Scratch::new();
        let service = TestFixture::new().service();
        let media = scratch.media();
        let mut importer = InboxImporter::new(scratch.inbox(), FakeRasterizer { pages: 0 });

        std::fs::write(scratch.inbox().join("notes.txt"), "hello").unwrap();
        std::fs::write(scratch.inbox().join(".hidden.png"), "x").unwrap();
        std::fs::write(scratch.inbox().join("half.png.part"), "x").unwrap();

        importer.scan(&service, &media).await;
        let report = importer.scan(&service, &media).await;
        assert_eq!(report, InboxReport::default());
        assert!(scratch.inbox().join("notes.txt").exists());
        // No channel is created until there is something to put in it.
        assert_eq!(service.count_channels().await.unwrap(), 0);
    }

    #[tokio::test]
    async fn reuses_the_existing_inbox_channel() {
        let scratch = Scratch::new();
        let service = TestFixture::new().service();
        let media = scratch.media();
        let mut importer = InboxImporter::new(scratch.inbox(), FakeRasterizer { pages: 0 });

        let existing = service
            .create_channel(NewChannel {
                title: INBOX_CHANNEL_TITLE.to_string(),
                description: None,
            })
            .await
            .unwrap();

        write_png(&scratch.inbox().join("a.png"), 1);
        importer.scan(&service, &media).await;
        let report = importer.scan(&service, &media).await;

        assert_eq!(report.channel_id, Some(existing.id));
        assert_eq!(service.count_channels().await.unwrap(), 1);
    }

    #[tokio::test]
    async fn keeps_both_originals_when_names_collide() {
        let scratch = Scratch::new();
        let service = TestFixture::new().service();
        let media = scratch.media();
        let mut importer = InboxImporter::new(scratch.inbox(), FakeRasterizer { pages: 0 });

        for _ in 0..2 {
            write_png(&scratch.inbox().join("scan.png"), 1);
            importer.scan(&service, &media).await;
            importer.scan(&service, &media).await;
        }

        let kept = std::fs::read_dir(scratch.inbox().join(IMPORTED_DIRNAME))
            .unwrap()
            .count();
        assert_eq!(kept, 2);
        assert_eq!(inbox_blocks(&service).await.len(), 2);
    }

    #[tokio::test]
    async fn a_missing_folder_does_nothing() {
        let scratch = Scratch::new();
        let service = TestFixture::new().service();
        let media = scratch.media();
        let mut importer =
            InboxImporter::new(scratch.root.join("nowhere"), FakeRasterizer { pages: 0 });

        assert_eq!(
            importer.scan(&service, &media).await,
            InboxReport::default()
        );
    }
}
