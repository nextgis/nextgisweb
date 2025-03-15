/*** {
    "revision": "4a6a7a01", "parents": ["4a4ce85e"],
    "date": "2025-03-05T03:29:06",
    "message": "Add WebMap options"
} ***/

ALTER TABLE webmap ADD COLUMN options jsonb;
UPDATE webmap SET options = '{}'::jsonb;
ALTER TABLE webmap ALTER COLUMN options SET NOT NULL;
