/**
 * Media utilities for Garden Tauri application.
 *
 * Provides helper functions for working with media files stored in the
 * application's data directory and served via Tauri's asset protocol.
 */

import { convertFileSrc } from "@tauri-apps/api/core";
import { appDataDir, join } from "@tauri-apps/api/path";

/**
 * Convert a relative media file path to an asset:// URL for use in HTML elements.
 *
 * This function takes the relative path stored in BlockContent (e.g., "images/abc123.jpg")
 * and converts it to a full asset:// URL that can be used in <img>, <video>, or <audio> src.
 *
 * @param filePath - Relative path within the media directory (e.g., "images/abc123.jpg")
 * @returns Promise resolving to an asset:// URL
 *
 * @example
 * ```typescript
 * import { getMediaAssetUrl } from '@garden/types';
 *
 * // In a Lit component
 * const imageUrl = await getMediaAssetUrl(block.content.file_path);
 * // Returns something like: "asset://localhost/Users/.../media/images/abc123.jpg"
 *
 * // Use in template
 * html`<img src=${imageUrl} />`
 * ```
 */
export async function getMediaAssetUrl(filePath: string): Promise<string> {
  const appData = await appDataDir();
  const fullPath = await join(appData, "media", filePath);
  return convertFileSrc(fullPath);
}

/**
 * Convert a relative media file path to an asset:// URL synchronously.
 *
 * This is a synchronous version that requires the app data directory to be
 * passed in. Useful when you've already resolved the appDataDir and want to
 * avoid async operations in render functions.
 *
 * @param filePath - Relative path within the media directory
 * @param appDataPath - The resolved app data directory path
 * @returns The asset:// URL
 *
 * @example
 * ```typescript
 * import { getMediaAssetUrlSync } from '@garden/types';
 *
 * // Resolve once at app startup
 * const appData = await appDataDir();
 *
 * // Then use sync version in render
 * const imageUrl = getMediaAssetUrlSync(block.content.file_path, appData);
 * ```
 */
export function getMediaAssetUrlSync(
  filePath: string,
  appDataPath: string,
): string {
  // Construct the full path manually (cross-platform path join)
  const separator = appDataPath.includes("\\") ? "\\" : "/";
  const fullPath = `${appDataPath}${separator}media${separator}${filePath.replace(/[/\\]/g, separator)}`;
  return convertFileSrc(fullPath);
}

/**
 * Check if a file path represents an image based on extension.
 *
 * @param filePath - The file path to check
 * @returns true if the file appears to be an image
 */
export function isImagePath(filePath: string): boolean {
  const ext = filePath.split(".").pop()?.toLowerCase();
  return ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "ico"].includes(
    ext || "",
  );
}

/**
 * Check if a file path represents a video based on extension.
 *
 * @param filePath - The file path to check
 * @returns true if the file appears to be a video
 */
export function isVideoPath(filePath: string): boolean {
  const ext = filePath.split(".").pop()?.toLowerCase();
  return ["mp4", "webm", "mov", "avi", "mkv", "m4v", "ogv"].includes(ext || "");
}

/**
 * Check if a file path represents audio based on extension.
 *
 * @param filePath - The file path to check
 * @returns true if the file appears to be audio
 */
export function isAudioPath(filePath: string): boolean {
  const ext = filePath.split(".").pop()?.toLowerCase();
  return ["mp3", "wav", "ogg", "flac", "aac", "m4a", "opus", "weba"].includes(
    ext || "",
  );
}

/**
 * Determine media type from file path.
 *
 * @param filePath - The file path to check
 * @returns 'image' | 'video' | 'audio' | 'unknown'
 */
export function getMediaType(
  filePath: string,
): "image" | "video" | "audio" | "unknown" {
  if (isImagePath(filePath)) return "image";
  if (isVideoPath(filePath)) return "video";
  if (isAudioPath(filePath)) return "audio";
  return "unknown";
}
