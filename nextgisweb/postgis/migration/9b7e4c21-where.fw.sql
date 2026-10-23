/*** {
    "revision": "9b7e4c21", "parents": ["5648398d"],
    "date": "2026-10-23T12:00:00",
    "message": "WHERE expression and functions"
} ***/

ALTER TABLE postgis_layer ADD COLUMN where_expression text;
ALTER TABLE postgis_layer ADD COLUMN where_functions jsonb;
ALTER TABLE postgis_layer ADD COLUMN where_operators jsonb;
ALTER TABLE postgis_connection ADD COLUMN where_functions jsonb;
ALTER TABLE postgis_connection ADD COLUMN where_operators jsonb;
