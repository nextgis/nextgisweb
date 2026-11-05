/*** {
    "revision": "569fd8f9", "parents": ["a3f8d916"],
    "date": "2026-11-04T19:20:55",
    "message": "Add storage kind column"
} ***/

ALTER TABLE raster_layer_storage
    ADD COLUMN kind character varying(50) NOT NULL DEFAULT 's3';

ALTER TABLE raster_layer_storage ALTER COLUMN kind DROP DEFAULT;
