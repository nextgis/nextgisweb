/*** { "revision": "3df5a71f" } ***/

CREATE TABLE wmsclient_layer_vendor_param
(
    resource_id integer NOT NULL,
    key character varying(255) NOT NULL,
    value character varying,
    CONSTRAINT wmsclient_layer_vendor_param_pkey PRIMARY KEY (resource_id, key),
    CONSTRAINT wmsclient_layer_vendor_param_resource_id_fkey FOREIGN KEY (resource_id)
        REFERENCES public.resource (id)
);
COMMENT ON TABLE wmsclient_layer_vendor_param IS 'wmsclient';

INSERT INTO wmsclient_layer_vendor_param (resource_id, key, value)
SELECT id, (kv).key, (kv).value
FROM (
	SELECT id, jsonb_each_text(vendor_params) as kv
	FROM wmsclient_layer
) as sq;

ALTER TABLE wmsclient_layer DROP COLUMN vendor_params;
