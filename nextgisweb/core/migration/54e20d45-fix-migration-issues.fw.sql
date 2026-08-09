/*** {
    "revision": "54e20d45", "parents": ["38db8bab"],
    "date": "2026-08-09T20:17:36",
    "message": "Fix migration issues"
} ***/

DROP TABLE IF EXISTS core_cstate;

CREATE INDEX IF NOT EXISTS ix_core_storage_stat_delta_resource_id
    ON core_storage_stat_delta(resource_id);

CREATE INDEX IF NOT EXISTS ix_core_storage_stat_dimension_resource_id
    ON core_storage_stat_dimension(resource_id);
