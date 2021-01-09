/*** {
    "revision": "16969697", "parents": ["00000000"],
    "date": "2018-02-02T00:00:00",
    "message": "Layer draw order"
} ***/

ALTER TABLE webmap
    ADD COLUMN draw_order_enabled boolean;

ALTER TABLE webmap_item
    ADD COLUMN draw_order_position integer;