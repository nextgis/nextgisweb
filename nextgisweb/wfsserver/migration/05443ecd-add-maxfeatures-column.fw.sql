/*** {
    "revision": "05443ecd", "parents": ["00000000"],
    "date": "2015-09-21T00:00:00",
    "message": "Add maxfeatures column"
} ***/

ALTER TABLE wfsserver_layer
    ADD COLUMN maxfeatures integer;