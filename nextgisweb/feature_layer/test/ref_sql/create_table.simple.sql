CREATE TABLE simple (
    resource_id INT NOT NULL,
    feature_id INT NOT NULL,
    value VARCHAR,
    PRIMARY KEY (resource_id, feature_id)
);

CREATE TABLE simple_et (
    resource_id INT NOT NULL,
    feature_id INT NOT NULL,
    version_id INT NOT NULL,
    version_op CHAR(1) NOT NULL,
    PRIMARY KEY (resource_id, feature_id),
    CONSTRAINT simple_et_resource_id_version_id_fkey FOREIGN KEY (resource_id, version_id) REFERENCES feature_layer_vobj (
        resource_id,
        version_id
    ) DEFERRABLE INITIALLY DEFERRED,
    FOREIGN KEY (resource_id) REFERENCES feature_layer_vmeta (
        resource_id
    ) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX simple_et_resource_id_version_id_feature_id_idx ON simple_et(resource_id, version_id, feature_id);

CREATE TABLE simple_ht (
    resource_id INT NOT NULL,
    version_id INT NOT NULL,
    feature_id INT NOT NULL,
    version_nid INT NOT NULL,
    version_op CHAR(1) NOT NULL,
    version_nop CHAR(1) NOT NULL,
    value VARCHAR,
    PRIMARY KEY (resource_id, version_id, feature_id),
    CONSTRAINT simple_ht_resource_id_version_nid_fkey FOREIGN KEY (resource_id, version_nid) REFERENCES feature_layer_vobj (
        resource_id,
        version_id
    ) DEFERRABLE INITIALLY DEFERRED,
    CONSTRAINT simple_ht_range_idx EXCLUDE USING gist(int4range(resource_id, resource_id, '[]') WITH &&, int4range(version_id, version_nid) WITH &&, int4range(feature_id, feature_id, '[]') WITH &&),
    FOREIGN KEY (resource_id) REFERENCES feature_layer_vmeta (
        resource_id
    ) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED
);
