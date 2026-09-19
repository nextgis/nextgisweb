/*** {
    "revision": "55b364a0", "parents": ["420c3c6c"],
    "date": "2026-09-19T16:21:13",
    "message": "Fix migration defaults"
} ***/

ALTER TABLE feature_description
    ALTER COLUMN feature_id DROP DEFAULT,
    ALTER COLUMN feature_id DROP IDENTITY IF EXISTS;

DROP SEQUENCE IF EXISTS feature_description_feature_id_seq;
