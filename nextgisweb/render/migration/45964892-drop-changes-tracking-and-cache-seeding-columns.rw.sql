/*** { "revision": "45964892" } ***/

ALTER TABLE resource_tile_cache
    ADD COLUMN track_changes boolean,
    ADD COLUMN seed_z smallint,
    ADD COLUMN seed_tstamp timestamp without time zone,
    ADD COLUMN seed_status character varying(50),
    ADD COLUMN seed_progress integer,
    ADD COLUMN seed_total integer;

UPDATE resource_tile_cache SET track_changes = FALSE;

ALTER TABLE resource_tile_cache ALTER COLUMN track_changes SET NOT NULL;
