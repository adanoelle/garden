// Garden Types
// Generated from Rust via ts-rs, plus hand-written API types

// Re-export generated types
export * from './generated/index.js';

// Re-export API wrapper
export { garden, channels, blocks, connections, GardenError } from './api.js';
export type { ErrorCode, TauriError } from './api.js';
