/*** {
    "revision": "37e63f22", "parents": ["323570bd"],
    "date": "2022-08-23T11:25:54",
    "message": "Fix enum"
} ***/

ALTER TABLE vector_layer DROP CONSTRAINT IF EXISTS vector_layer_geometry_type_check;
ALTER TABLE vector_layer ALTER COLUMN geometry_type TYPE character varying(50);
