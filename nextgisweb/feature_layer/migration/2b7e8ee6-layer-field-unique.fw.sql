/*** {
    "revision": "2b7e8ee6", "parents": ["0f7ab6a1"],
    "date": "2020-12-12T00:00:00",
    "message": "Add layer field keyname and display_name unique constraints"
} ***/

ALTER TABLE layer_field
    ADD CONSTRAINT layer_field_layer_id_keyname_key UNIQUE (layer_id, keyname);

ALTER TABLE layer_field
    ADD CONSTRAINT layer_field_layer_id_display_name_key UNIQUE (layer_id, display_name);