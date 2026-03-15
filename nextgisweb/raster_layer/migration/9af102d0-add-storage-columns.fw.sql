/*** {
    "revision": "9af102d0", "parents": ["4da181ed"],
    "date": "2026-03-16T00:00:00",
    "message": "Add storage columns to raster_layer"
} ***/

ALTER TABLE raster_layer
    ADD COLUMN storage_id integer REFERENCES raster_layer_storage(id),
    ADD COLUMN storage_filename character varying;
