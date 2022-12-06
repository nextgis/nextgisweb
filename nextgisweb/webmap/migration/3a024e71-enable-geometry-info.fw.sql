/*** {
    "revision": "3a024e71", "parents": ["390b25de"],
    "date": "2022-12-06T19:47:52",
    "message": "Enable geometry info"
} ***/

INSERT INTO setting (component, "name", value)
VALUES ('webmap', 'show_geometry_info', 'true')
ON CONFLICT DO NOTHING;
