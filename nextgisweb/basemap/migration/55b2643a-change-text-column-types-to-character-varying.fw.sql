/*** {
    "revision": "55b2643a", "parents": ["5497c119"],
    "date": "2026-09-19T11:39:53",
    "message": "Change `text` column types to `character varying`"
} ***/

ALTER TABLE basemap_layer
    ALTER COLUMN copyright_text TYPE character varying,
    ALTER COLUMN copyright_url TYPE character varying;
