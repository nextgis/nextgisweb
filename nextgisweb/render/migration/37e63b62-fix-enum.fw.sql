/*** {
    "revision": "37e63b62", "parents": ["00000000"],
    "date": "2022-08-23T11:21:47",
    "message": "Fix enum"
} ***/

ALTER TABLE resource_tile_cache DROP CONSTRAINT IF EXISTS resource_tile_cache_seed_status_check;
ALTER TABLE resource_tile_cache ALTER COLUMN seed_status TYPE character varying(50);
