/*** {
    "revision": "2cbdc86f", "parents": ["2c3ce7cd"],
    "date": "2021-02-12T06:29:43",
    "message": "Defer unique constraints"
} ***/

ALTER TABLE layer_field DROP CONSTRAINT layer_field_layer_id_keyname_key;
ALTER TABLE layer_field
    ADD CONSTRAINT layer_field_layer_id_keyname_key UNIQUE (layer_id, keyname)
    DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE public.layer_field DROP CONSTRAINT layer_field_layer_id_display_name_key;
ALTER TABLE public.layer_field
    ADD CONSTRAINT layer_field_layer_id_display_name_key UNIQUE (layer_id, display_name)
    DEFERRABLE INITIALLY DEFERRED;
