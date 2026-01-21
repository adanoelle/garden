/**
 * Runtime validators for Garden types.
 *
 * @remarks
 * This module provides Zod schemas for validating data at runtime boundaries:
 * - API responses from the Tauri backend
 * - User input before sending to the backend
 *
 * All schemas match the TypeScript types generated from Rust via ts-rs.
 *
 * @example
 * ```typescript
 * import { parseBlock, isImageContent, validateUrl } from '@garden/types/validators';
 *
 * // Validate API response
 * const block = parseBlock(response);
 *
 * // Type-safe content handling
 * if (isImageContent(block.content)) {
 *   console.log(block.content.file_path);
 * }
 *
 * // Validate user input
 * const result = validateUrl(userInput);
 * if (!result.success) {
 *   showError(result.error.message);
 * }
 * ```
 *
 * @packageDocumentation
 */

import { z } from "zod";
import type { BlockContent, Block, Channel, Page } from "./generated/index.js";

// ─────────────────────────────────────────────────────────────────────────────
// BlockContent Variant Schemas
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Schema for text block content.
 *
 * @remarks
 * Validates that the body is a non-empty string.
 */
export const TextContentSchema = z.object({
  type: z.literal("text"),
  body: z.string().min(1, "Text body cannot be empty"),
});

/**
 * Schema for link block content.
 *
 * @remarks
 * Validates URL format and allows nullable metadata fields.
 */
export const LinkContentSchema = z.object({
  type: z.literal("link"),
  url: z.string().url("Invalid URL format"),
  title: z.string().nullable(),
  description: z.string().nullable(),
  alt_text: z.string().nullable(),
});

/**
 * Schema for image block content.
 *
 * @remarks
 * Validates file path, dimensions, and MIME type format.
 * The `original_url` is validated as a URL when present.
 */
export const ImageContentSchema = z.object({
  type: z.literal("image"),
  file_path: z.string().min(1, "File path cannot be empty"),
  original_url: z.string().url().nullable(),
  width: z.number().int().positive().nullable(),
  height: z.number().int().positive().nullable(),
  mime_type: z.string().regex(/^image\//, "Must be an image MIME type"),
  alt_text: z.string().nullable(),
});

/**
 * Schema for video block content.
 *
 * @remarks
 * Validates file path, dimensions, duration, and MIME type format.
 */
export const VideoContentSchema = z.object({
  type: z.literal("video"),
  file_path: z.string().min(1, "File path cannot be empty"),
  original_url: z.string().url().nullable(),
  width: z.number().int().positive().nullable(),
  height: z.number().int().positive().nullable(),
  duration: z.number().positive().nullable(),
  mime_type: z.string().regex(/^video\//, "Must be a video MIME type"),
  alt_text: z.string().nullable(),
});

/**
 * Schema for audio block content.
 *
 * @remarks
 * Validates file path, duration, and MIME type format.
 * Includes optional ID3-style metadata (title, artist).
 */
export const AudioContentSchema = z.object({
  type: z.literal("audio"),
  file_path: z.string().min(1, "File path cannot be empty"),
  original_url: z.string().url().nullable(),
  duration: z.number().positive().nullable(),
  mime_type: z.string().regex(/^audio\//, "Must be an audio MIME type"),
  title: z.string().nullable(),
  artist: z.string().nullable(),
});

/**
 * Schema for BlockContent discriminated union.
 *
 * @remarks
 * Validates all five content types: text, link, image, video, audio.
 * Uses Zod's discriminatedUnion for efficient parsing based on the `type` field.
 */
export const BlockContentSchema = z.discriminatedUnion("type", [
  TextContentSchema,
  LinkContentSchema,
  ImageContentSchema,
  VideoContentSchema,
  AudioContentSchema,
]);

// ─────────────────────────────────────────────────────────────────────────────
// Type Guards
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Checks if the content is a text block.
 *
 * @param content - The block content to check
 * @returns `true` if content is text type, with narrowed type
 *
 * @example
 * ```typescript
 * if (isTextContent(block.content)) {
 *   console.log(block.content.body); // TypeScript knows body exists
 * }
 * ```
 */
export function isTextContent(
  content: BlockContent,
): content is BlockContent & { type: "text" } {
  return content.type === "text";
}

/**
 * Checks if the content is a link block.
 *
 * @param content - The block content to check
 * @returns `true` if content is link type, with narrowed type
 *
 * @example
 * ```typescript
 * if (isLinkContent(block.content)) {
 *   window.open(block.content.url); // TypeScript knows url exists
 * }
 * ```
 */
export function isLinkContent(
  content: BlockContent,
): content is BlockContent & { type: "link" } {
  return content.type === "link";
}

/**
 * Checks if the content is an image block.
 *
 * @param content - The block content to check
 * @returns `true` if content is image type, with narrowed type
 */
export function isImageContent(
  content: BlockContent,
): content is BlockContent & { type: "image" } {
  return content.type === "image";
}

/**
 * Checks if the content is a video block.
 *
 * @param content - The block content to check
 * @returns `true` if content is video type, with narrowed type
 */
export function isVideoContent(
  content: BlockContent,
): content is BlockContent & { type: "video" } {
  return content.type === "video";
}

/**
 * Checks if the content is an audio block.
 *
 * @param content - The block content to check
 * @returns `true` if content is audio type, with narrowed type
 */
export function isAudioContent(
  content: BlockContent,
): content is BlockContent & { type: "audio" } {
  return content.type === "audio";
}

/**
 * Checks if the content is any media type (image, video, or audio).
 *
 * @param content - The block content to check
 * @returns `true` if content is a media type, with narrowed type
 *
 * @remarks
 * Useful for rendering media blocks differently from text/link blocks.
 *
 * @example
 * ```typescript
 * if (isMediaContent(block.content)) {
 *   const url = await getMediaAssetUrl(block.content.file_path);
 * }
 * ```
 */
export function isMediaContent(
  content: BlockContent,
): content is BlockContent & { type: "image" | "video" | "audio" } {
  return (
    content.type === "image" ||
    content.type === "video" ||
    content.type === "audio"
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Entity Schemas
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Schema for ISO 8601 datetime strings.
 *
 * @remarks
 * Validates that the string can be parsed as a valid Date.
 * Used for `created_at` and `updated_at` fields.
 */
export const DateTimeSchema = z.string().refine(
  (val) => {
    const date = new Date(val);
    return !isNaN(date.getTime());
  },
  { message: "Invalid ISO 8601 datetime string" },
);

/**
 * Schema for a Block entity.
 *
 * @remarks
 * Includes the content discriminated union and all archive metadata fields.
 */
export const BlockSchema = z.object({
  id: z.string(),
  content: BlockContentSchema,
  created_at: DateTimeSchema,
  updated_at: DateTimeSchema,
  source_url: z.string().url().nullable(),
  source_title: z.string().nullable(),
  creator: z.string().nullable(),
  original_date: z.string().nullable(),
  notes: z.string().nullable(),
});

/**
 * Schema for a Channel entity.
 */
export const ChannelSchema = z.object({
  id: z.string(),
  title: z.string().min(1, "Channel title cannot be empty"),
  description: z.string().nullable(),
  created_at: DateTimeSchema,
  updated_at: DateTimeSchema,
});

// ─────────────────────────────────────────────────────────────────────────────
// Pagination Schemas
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a pagination wrapper schema for any item type.
 *
 * @typeParam T - The Zod schema type for items in the page
 * @param itemSchema - The schema for individual items
 * @returns A schema for `Page<T>`
 *
 * @example
 * ```typescript
 * const MyPageSchema = createPageSchema(MyItemSchema);
 * const page = MyPageSchema.parse(response);
 * ```
 */
export function createPageSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    items: z.array(itemSchema),
    total: z.number().int().nonnegative(),
    offset: z.number().int().nonnegative(),
    limit: z.number().int().positive(),
  });
}

/**
 * Schema for a paginated list of channels.
 */
export const ChannelPageSchema = createPageSchema(ChannelSchema);

/**
 * Schema for a paginated list of blocks.
 */
export const BlockPageSchema = createPageSchema(BlockSchema);

// ─────────────────────────────────────────────────────────────────────────────
// Parse Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parses and validates block content from unknown data.
 *
 * @param data - The data to parse
 * @returns The validated BlockContent
 * @throws {z.ZodError} If validation fails
 *
 * @example
 * ```typescript
 * try {
 *   const content = parseBlockContent(response.content);
 * } catch (e) {
 *   if (e instanceof z.ZodError) {
 *     console.error('Validation failed:', e.errors);
 *   }
 * }
 * ```
 */
export function parseBlockContent(data: unknown): BlockContent {
  return BlockContentSchema.parse(data) as BlockContent;
}

/**
 * Safely parses block content without throwing.
 *
 * @param data - The data to parse
 * @returns A result object with `success`, `data`, or `error`
 *
 * @example
 * ```typescript
 * const result = safeParseBlockContent(response.content);
 * if (result.success) {
 *   handleContent(result.data);
 * } else {
 *   logError(result.error);
 * }
 * ```
 */
export function safeParseBlockContent(data: unknown) {
  return BlockContentSchema.safeParse(data);
}

/**
 * Parses and validates a block from unknown data.
 *
 * @param data - The data to parse
 * @returns The validated Block
 * @throws {z.ZodError} If validation fails
 */
export function parseBlock(data: unknown): Block {
  return BlockSchema.parse(data) as Block;
}

/**
 * Safely parses a block without throwing.
 *
 * @param data - The data to parse
 * @returns A result object with `success`, `data`, or `error`
 */
export function safeParseBlock(data: unknown) {
  return BlockSchema.safeParse(data);
}

/**
 * Parses and validates a channel from unknown data.
 *
 * @param data - The data to parse
 * @returns The validated Channel
 * @throws {z.ZodError} If validation fails
 */
export function parseChannel(data: unknown): Channel {
  return ChannelSchema.parse(data) as Channel;
}

/**
 * Safely parses a channel without throwing.
 *
 * @param data - The data to parse
 * @returns A result object with `success`, `data`, or `error`
 */
export function safeParseChannel(data: unknown) {
  return ChannelSchema.safeParse(data);
}

/**
 * Parses and validates a paginated channel list.
 *
 * @param data - The data to parse
 * @returns The validated Page of Channels
 * @throws {z.ZodError} If validation fails
 */
export function parseChannelPage(data: unknown): Page<Channel> {
  return ChannelPageSchema.parse(data) as Page<Channel>;
}

/**
 * Parses and validates a paginated block list.
 *
 * @param data - The data to parse
 * @returns The validated Page of Blocks
 * @throws {z.ZodError} If validation fails
 */
export function parseBlockPage(data: unknown): Page<Block> {
  return BlockPageSchema.parse(data) as Page<Block>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Input Validation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Schema for new text block input.
 */
export const NewTextBlockSchema = z.object({
  content: TextContentSchema,
});

/**
 * Schema for new link block input.
 *
 * @remarks
 * More lenient than the full LinkContentSchema - allows optional metadata.
 */
export const NewLinkBlockSchema = z.object({
  content: z.object({
    type: z.literal("link"),
    url: z.string().url("Please enter a valid URL"),
    title: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    alt_text: z.string().nullable().optional(),
  }),
});

/**
 * Schema for new channel input.
 *
 * @remarks
 * Includes length limits appropriate for user input.
 */
export const NewChannelInputSchema = z.object({
  title: z
    .string()
    .min(1, "Channel title is required")
    .max(200, "Channel title is too long"),
  description: z.string().max(2000, "Description is too long").nullable(),
});

/**
 * Validates user input for creating a channel.
 *
 * @param input - The user input to validate
 * @returns A result object with `success`, `data`, or `error`
 *
 * @example
 * ```typescript
 * const result = validateNewChannelInput({
 *   title: userTitle,
 *   description: userDescription,
 * });
 *
 * if (!result.success) {
 *   setError(result.error.errors[0].message);
 *   return;
 * }
 *
 * await garden.channels.create(result.data);
 * ```
 */
export function validateNewChannelInput(input: {
  title: string;
  description: string | null;
}) {
  return NewChannelInputSchema.safeParse(input);
}

/**
 * Validates a URL string.
 *
 * @param url - The URL string to validate
 * @returns A result object with `success`, `data`, or `error`
 *
 * @example
 * ```typescript
 * const result = validateUrl(userInput);
 * if (!result.success) {
 *   setError('Please enter a valid URL');
 * }
 * ```
 */
export function validateUrl(url: string) {
  return z.string().url().safeParse(url);
}

// Re-export zod for consumers who need custom schemas
export { z } from "zod";
