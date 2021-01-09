/*** {
    "revision": "2807b08b", "parents": ["00000000"],
    "date": "2020-06-22T00:00:00",
    "message": "Layer position"
} ***/

ALTER TABLE wmsserver_layer
    ADD COLUMN position integer;
