/*** {
    "revision": "54a9d9c7", "parents": ["54e223ea"],
    "date": "2026-07-29T21:10:47",
    "message": "Add group enabled column"
} ***/

ALTER TABLE webmap_item ADD COLUMN group_enabled boolean;

UPDATE webmap_item SET group_enabled = TRUE WHERE item_type = 'group';
