/*** { "revision": "51299994" } ***/

ALTER TABLE feature_attachment DROP CONSTRAINT feature_attachment_pkey;
ALTER TABLE feature_attachment DROP CONSTRAINT feature_attachment_keyname_unique;
ALTER TABLE feature_attachment RENAME TO feature_attachment_tmp;

CREATE TABLE feature_attachment
(
    id integer NOT NULL DEFAULT nextval('feature_attachment_id_seq'::regclass),
    resource_id integer NOT NULL,
    feature_id integer NOT NULL,
    fileobj_id integer NOT NULL,
    keyname character varying,
    name character varying,
    mime_type character varying NOT NULL,
    description character varying,
    file_meta jsonb,
    size bigint NOT NULL,
    CONSTRAINT feature_attachment_pkey PRIMARY KEY (id),
    CONSTRAINT feature_attachment_keyname_unique UNIQUE (resource_id, feature_id, keyname)
        DEFERRABLE INITIALLY DEFERRED,
    CONSTRAINT feature_attachment_fileobj_id_fkey FOREIGN KEY (fileobj_id)
        REFERENCES fileobj (id) MATCH SIMPLE,
    CONSTRAINT feature_attachment_resource_id_fkey FOREIGN KEY (resource_id)
        REFERENCES resource (id)
);
ALTER SEQUENCE feature_attachment_id_seq OWNED BY feature_attachment.id;

INSERT INTO feature_attachment (
    resource_id, feature_id, fileobj_id, keyname, name, mime_type, description, size
)
SELECT resource_id, feature_id, fileobj_id, keyname, name, mime_type, description, -1
FROM feature_attachment_tmp;

DROP TABLE feature_attachment_tmp;

CREATE INDEX feature_attachment_resource_id_feature_id_idx
    ON feature_attachment USING btree
    (resource_id ASC NULLS LAST, feature_id ASC NULLS LAST)
    WITH (fillfactor=100);
