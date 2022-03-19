/*** {
    "revision": "33d90e2c", "parents": ["33b2c229"],
    "date": "2022-02-02T03:40:30",
    "message": "Layer identifiable column"
} ***/

ALTER TABLE webmap_item ADD COLUMN layer_identifiable boolean;
UPDATE webmap_item SET layer_identifiable = true WHERE item_type = 'layer'
