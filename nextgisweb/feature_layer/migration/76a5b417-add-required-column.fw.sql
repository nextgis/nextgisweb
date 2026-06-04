/*** {
    "revision": "76a5b417", "parents": ["42550420"],
    "date": "2026-06-04T00:00:00",
    "message": "Add required column"
} ***/

ALTER TABLE layer_field ADD COLUMN required boolean NOT NULL DEFAULT false;
ALTER TABLE layer_field ALTER COLUMN required DROP DEFAULT;
