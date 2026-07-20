/*** {
    "revision": "fe525857", "parents": ["46005e79"],
    "date": "2026-06-05T00:00:00",
    "message": "Make srs_id nullable and add geometry_type/srs_id consistency check"
} ***/

ALTER TABLE vector_layer ALTER COLUMN srs_id DROP NOT NULL;

ALTER TABLE vector_layer ADD CONSTRAINT vector_layer_geom_type_srs_check
    CHECK ((geometry_type = 'NONE') = (srs_id IS NULL));
