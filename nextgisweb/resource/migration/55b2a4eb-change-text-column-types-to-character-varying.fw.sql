/*** {
    "revision": "55b2a4eb", "parents": ["51aa8784"],
    "date": "2026-09-19T12:50:52",
    "message": "Change `text` column types to `character varying`"
} ***/

ALTER TABLE resource_favorite
    ALTER COLUMN component TYPE character varying,
    ALTER COLUMN kind TYPE character varying;
