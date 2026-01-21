// Garden Types
// Generated from Rust via ts-rs, plus hand-written API types

// Re-export generated types
export * from "./generated/index.js";

// Re-export API wrapper
export { garden, channels, blocks, connections, media, GardenError } from "./api.js";
export type { ErrorCode, TauriError } from "./api.js";

// Re-export media utilities
export {
  getMediaAssetUrl,
  getMediaAssetUrlSync,
  isImagePath,
  isVideoPath,
  isAudioPath,
  getMediaType,
} from "./media.js";

// Re-export window utilities
export {
  gardenWindow,
  isTauri,
  setFullscreen,
  isFullscreen,
  toggleFullscreen,
  isFullscreenSupported,
} from "./window.js";

// Re-export validators and type guards
export {
  // Schemas
  BlockContentSchema,
  TextContentSchema,
  LinkContentSchema,
  ImageContentSchema,
  VideoContentSchema,
  AudioContentSchema,
  BlockSchema,
  ChannelSchema,
  DateTimeSchema,
  ChannelPageSchema,
  BlockPageSchema,
  NewChannelInputSchema,
  // Type guards
  isTextContent,
  isLinkContent,
  isImageContent,
  isVideoContent,
  isAudioContent,
  isMediaContent,
  // Parse functions
  parseBlockContent,
  safeParseBlockContent,
  parseBlock,
  safeParseBlock,
  parseChannel,
  safeParseChannel,
  parseChannelPage,
  parseBlockPage,
  // Input validation
  validateNewChannelInput,
  validateUrl,
  // Zod re-export
  z,
} from "./validators.js";
