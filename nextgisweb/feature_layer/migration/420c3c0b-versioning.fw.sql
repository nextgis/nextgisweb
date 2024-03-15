/*** {
    "revision": "420c3c0b", "parents": ["37e53073"],
    "date": "2024-01-12T06:16:39",
    "message": "Versioning"
} ***/

CREATE SEQUENCE feature_layer_vmeta_epoch_seq;

CREATE TABLE feature_layer_vmeta(
    resource_id integer NOT NULL,
    epoch integer NOT NULL,
    latest integer NOT NULL,
    started timestamp without time zone NOT NULL,
    updated timestamp without time zone NOT NULL,
    PRIMARY KEY (resource_id),
    CONSTRAINT feature_layer_vmeta_check CHECK ((((latest = 1) AND (updated = started)) OR ((latest > 1) AND (updated > started)))),
    CONSTRAINT feature_layer_vmeta_resource_id_fkey FOREIGN KEY (resource_id) REFERENCES resource(id)
);

COMMENT ON TABLE feature_layer_vmeta IS 'feature_layer';

CREATE TABLE feature_layer_vobj(
    resource_id integer NOT NULL,
    version_id integer NOT NULL,
    tstamp timestamp without time zone NOT NULL,
    user_id integer,
    PRIMARY KEY (resource_id, version_id),
    CONSTRAINT feature_layer_vobj_resource_id__resource_fkey FOREIGN KEY (resource_id) REFERENCES resource(id) ON DELETE CASCADE,
    CONSTRAINT feature_layer_vobj_resource_id__vmeta_fkey FOREIGN KEY (resource_id) REFERENCES feature_layer_vmeta(resource_id) ON DELETE CASCADE,
    CONSTRAINT feature_layer_vobj_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth_user(principal_id)
);

COMMENT ON TABLE feature_layer_vobj IS 'feature_layer';
