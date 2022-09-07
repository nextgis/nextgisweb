/*** {
    "revision": "37e639a6", "parents": ["32357124"],
    "date": "2022-08-23T11:19:53",
    "message": "Fix enum"
} ***/

ALTER TABLE postgis_layer DROP CONSTRAINT IF EXISTS postgis_layer_geometry_type_check;
ALTER TABLE postgis_layer ALTER COLUMN geometry_type TYPE character varying(50);
