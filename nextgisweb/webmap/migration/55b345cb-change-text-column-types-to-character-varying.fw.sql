/*** {
    "revision": "55b345cb", "parents": ["54a9d9c7"],
    "date": "2026-09-19T15:47:24",
    "message": "Change `text` column types to `character varying`"
} ***/

ALTER TABLE webmap_item ALTER COLUMN layer_adapter TYPE character varying(50);
