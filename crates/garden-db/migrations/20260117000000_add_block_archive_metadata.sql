-- Add archive metadata fields to blocks table
-- These fields support the block detail view with archival information

-- Original URL where content was curated from
ALTER TABLE blocks ADD COLUMN source_url TEXT;

-- Custom display text for the source link
ALTER TABLE blocks ADD COLUMN source_title TEXT;

-- Author or artist of the original content
ALTER TABLE blocks ADD COLUMN creator TEXT;

-- Original publication date (flexible format string)
ALTER TABLE blocks ADD COLUMN original_date TEXT;

-- User's personal notes about this block
ALTER TABLE blocks ADD COLUMN notes TEXT;
