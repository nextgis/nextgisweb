/*** {
    "revision": "37e6401f", "parents": ["33d90e2c"],
    "date": "2022-08-23T11:26:59",
    "message": "Fix enum"
} ***/

ALTER TABLE webmap_item DROP CONSTRAINT IF EXISTS webmap_item_item_type_check;
ALTER TABLE webmap_item ALTER COLUMN item_type TYPE character varying(50);
