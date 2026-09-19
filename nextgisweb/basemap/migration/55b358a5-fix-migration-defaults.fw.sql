/*** {
    "revision": "55b358a5", "parents": ["55b2643a"],
    "date": "2026-09-19T16:08:05",
    "message": "Fix migration defaults"
} ***/

ALTER TABLE basemap_webmap_config ALTER COLUMN disable DROP DEFAULT;
