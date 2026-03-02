/*** {
    "revision": "51aa8784", "parents": ["45f6d7cf"],
    "date": "2026-03-02T04:51:25",
    "message": "Display name unique defer"
} ***/

ALTER TABLE resource DROP CONSTRAINT resource_parent_id_display_name_key;
ALTER TABLE resource ADD CONSTRAINT resource_parent_id_display_name_key
    UNIQUE (parent_id, display_name) DEFERRABLE INITIALLY DEFERRED;
