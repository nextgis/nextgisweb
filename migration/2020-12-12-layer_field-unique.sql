ALTER TABLE layer_field
    ADD CONSTRAINT layer_field_layer_id_keyname_key UNIQUE (layer_id, keyname);

ALTER TABLE layer_field
    ADD CONSTRAINT layer_field_layer_id_display_name_key UNIQUE (layer_id, display_name);
