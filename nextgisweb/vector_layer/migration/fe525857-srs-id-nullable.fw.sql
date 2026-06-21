/*** {
    "revision": "fe525857", "parents": ["46005e79"],
    "date": "2026-06-05T00:00:00",
    "message": "Make srs_id nullable for NONE geometry type support"
} ***/

ALTER TABLE vector_layer ALTER COLUMN srs_id DROP NOT NULL;
