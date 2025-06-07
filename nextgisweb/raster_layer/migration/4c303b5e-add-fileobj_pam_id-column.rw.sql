/*** { "revision": "4c303b5e" } ***/

ALTER TABLE raster_layer DROP CONSTRAINT raster_layer_fileobj_pam_id_fkey;
ALTER TABLE raster_layer DROP COLUMN fileobj_pam_id;
