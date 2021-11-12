/*** {
    "revision": "32357124", "parents": ["00000000"],
    "date": "2021-11-12T07:11:45",
    "message": "Geometry type length"
} ***/

ALTER TABLE postgis_layer ALTER COLUMN geometry_type TYPE character varying(16);
