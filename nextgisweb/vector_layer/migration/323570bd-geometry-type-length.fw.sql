/*** {
    "revision": "323570bd", "parents": ["00000000"],
    "date": "2021-11-12T07:11:19",
    "message": "Geometry type length"
} ***/

ALTER TABLE vector_layer ALTER COLUMN geometry_type TYPE character varying(16);
