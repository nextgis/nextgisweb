/*** {
    "revision": "43b50af4", "parents": ["43176859"],
    "date": "2024-04-04T03:04:38",
    "message": "Add group exclusive column"
} ***/

ALTER TABLE webmap_item ADD COLUMN group_exclusive boolean;
