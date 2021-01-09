/*** {
    "revision": "28a17b5b", "parents": ["05443ecd"],
    "date": "2020-07-22T00:00:00",
    "message": "Layer keyname unique constraint"
} ***/

ALTER TABLE wfsserver_layer
    ADD CONSTRAINT wfsserver_layer_service_id_keyname_key UNIQUE (service_id, keyname);