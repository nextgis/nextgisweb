/*** {
    "revision": "438055b2", "parents": ["37e53073"],
    "date": "2024-03-24T20:19:01",
    "message": "Add text_search column"
} ***/

ALTER TABLE layer_field ADD COLUMN text_search boolean NOT NULL DEFAULT true;
ALTER TABLE layer_field ALTER COLUMN text_search DROP DEFAULT;
