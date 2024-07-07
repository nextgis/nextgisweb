/*** {
    "revision": "45964892", "parents": ["37e63b62"],
    "date": "2024-07-07T00:04:23",
    "message": "Drop changes tracking and cache seeding columns"
} ***/

ALTER TABLE resource_tile_cache
    DROP COLUMN track_changes,
    DROP COLUMN seed_z,
    DROP COLUMN seed_tstamp,
    DROP COLUMN seed_status,
    DROP COLUMN seed_progress,
    DROP COLUMN seed_total;
