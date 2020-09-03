ALTER TABLE public.wfsserver_layer
    ADD CONSTRAINT wfsserver_layer_service_id_keyname_key UNIQUE (service_id, keyname);
