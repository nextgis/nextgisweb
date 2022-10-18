/*** {
    "revision": "38db8bab", "parents": ["2e803d47"],
    "date": "2022-10-10T07:50:00",
    "message": "JSONB setting value"
} ***/

ALTER TABLE setting ALTER COLUMN value TYPE jsonb USING value::jsonb;
