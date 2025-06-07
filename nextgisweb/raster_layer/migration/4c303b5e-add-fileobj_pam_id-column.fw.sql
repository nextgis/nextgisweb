/*** {
    "revision": "4c303b5e", "parents": ["3260f32e"],
    "date": "2025-06-01T15:48:15",
    "message": "add fileobj_pam_id column"
} ***/

ALTER TABLE raster_layer ADD COLUMN fileobj_pam_id integer;
ALTER TABLE raster_layer  ADD CONSTRAINT raster_layer_fileobj_pam_id_fkey
    FOREIGN KEY (fileobj_pam_id) REFERENCES fileobj (id);
