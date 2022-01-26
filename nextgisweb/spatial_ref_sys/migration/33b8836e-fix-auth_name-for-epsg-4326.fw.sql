/*** {
    "revision": "33b8836e", "parents": ["2c1c1918"],
    "date": "2022-01-26T19:19:31",
    "message": "Fix auth_name for EPSG:4326"
} ***/

UPDATE srs SET auth_name = 'EPSG' WHERE id = 4326;
