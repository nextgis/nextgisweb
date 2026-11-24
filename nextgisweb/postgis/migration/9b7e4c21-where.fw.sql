/*** {
    "revision": "9b7e4c21", "parents": ["5648398d"],
    "date": "2026-10-23T12:00:00",
    "message": "WHERE expression and connection allowlist"
} ***/

ALTER TABLE postgis_layer ADD COLUMN where_expression text;
ALTER TABLE postgis_connection ADD COLUMN where_allowlist jsonb;
