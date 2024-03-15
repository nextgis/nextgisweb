/*** {
    "revision": "420c3c4e", "parents": ["3f5e63e6"],
    "date": "2024-01-12T06:16:56",
    "message": "Versioning",
    "dependencies": ["feature_layer==420c3c0b"]
} ***/

CREATE TABLE feature_attachment_et(
    resource_id integer NOT NULL,
    feature_id integer NOT NULL,
    extension_id integer NOT NULL,
    version_id integer NOT NULL,
    version_op character(1) NOT NULL,
    PRIMARY KEY (resource_id, feature_id, extension_id),
    CONSTRAINT feature_attachment_et_resource_id_fkey FOREIGN KEY (resource_id) REFERENCES feature_layer_vmeta(resource_id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,
    CONSTRAINT feature_attachment_et_resource_id_version_id_fkey FOREIGN KEY (resource_id, version_id) REFERENCES feature_layer_vobj(resource_id, version_id) DEFERRABLE INITIALLY DEFERRED
);

COMMENT ON TABLE feature_attachment_et IS 'feature_attachment';

CREATE INDEX feature_attachment_et_resource_id_version_id_feature_id_idx ON feature_attachment_et USING btree (resource_id, version_id, feature_id);

CREATE TABLE feature_attachment_ht(
    resource_id integer NOT NULL,
    version_id integer NOT NULL,
    feature_id integer NOT NULL,
    extension_id integer NOT NULL,
    version_nid integer NOT NULL,
    version_op character(1) NOT NULL,
    version_nop character(1) NOT NULL,
    fileobj_id integer,
    keyname character varying,
    name character varying,
    mime_type character varying,
    description character varying,
    PRIMARY KEY (resource_id, version_id, feature_id, extension_id),
    CONSTRAINT feature_attachment_ht_fileobj_id_fkey FOREIGN KEY (fileobj_id) REFERENCES fileobj(id),
    CONSTRAINT feature_attachment_ht_resource_id_fkey FOREIGN KEY (resource_id) REFERENCES feature_layer_vmeta(resource_id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,
    CONSTRAINT feature_attachment_ht_resource_id_version_nid_fkey FOREIGN KEY (resource_id, version_nid) REFERENCES feature_layer_vobj(resource_id, version_id) DEFERRABLE INITIALLY DEFERRED,
    CONSTRAINT feature_attachment_ht_range_idx EXCLUDE USING gist (int4range(resource_id, resource_id, '[]'::text) WITH &&, int4range(version_id, version_nid) WITH &&, int4range(feature_id, feature_id, '[]'::text) WITH &&, int4range(extension_id, extension_id, '[]'::text) WITH &&)
);

COMMENT ON TABLE feature_attachment_ht IS 'feature_attachment';
