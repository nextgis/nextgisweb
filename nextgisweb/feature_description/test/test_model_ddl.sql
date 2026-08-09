/*** Table: feature_description ***/

CREATE TABLE feature_description (
    resource_id integer NOT NULL,
    feature_id integer NOT NULL,
    value character varying NOT NULL,
    PRIMARY KEY (resource_id, feature_id),
    FOREIGN KEY (resource_id) REFERENCES resource (id)
);

COMMENT ON TABLE feature_description IS 'feature_description';

/*** Table: feature_description_et ***/

CREATE TABLE feature_description_et (
    resource_id integer NOT NULL,
    feature_id integer NOT NULL,
    version_id integer NOT NULL,
    version_op character(1) NOT NULL,
    PRIMARY KEY (resource_id, feature_id),
    CONSTRAINT feature_description_et_resource_id_version_id_fkey FOREIGN KEY (resource_id, version_id) REFERENCES feature_layer_vobj (resource_id, version_id) DEFERRABLE INITIALLY DEFERRED,
    FOREIGN KEY (resource_id) REFERENCES feature_layer_vmeta (resource_id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED
);

COMMENT ON TABLE feature_description_et IS 'feature_description';

CREATE INDEX feature_description_et_resource_id_version_id_feature_id_idx ON feature_description_et(resource_id, version_id, feature_id);

/*** Table: feature_description_ht ***/

CREATE TABLE feature_description_ht (
    resource_id integer NOT NULL,
    version_id integer NOT NULL,
    feature_id integer NOT NULL,
    version_nid integer NOT NULL,
    version_op character(1) NOT NULL,
    version_nop character(1) NOT NULL,
    value character varying,
    PRIMARY KEY (resource_id, version_id, feature_id),
    CONSTRAINT feature_description_ht_resource_id_version_nid_fkey FOREIGN KEY (resource_id, version_nid) REFERENCES feature_layer_vobj (resource_id, version_id) DEFERRABLE INITIALLY DEFERRED,
    CONSTRAINT feature_description_ht_range_idx EXCLUDE USING gist(int4range(resource_id, resource_id, '[]') WITH &&, int4range(version_id, version_nid) WITH &&, int4range(feature_id, feature_id, '[]') WITH &&),
    FOREIGN KEY (resource_id) REFERENCES feature_layer_vmeta (resource_id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED
);

COMMENT ON TABLE feature_description_ht IS 'feature_description';
