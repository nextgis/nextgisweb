CREATE TABLE resource_social
(
    resource_id integer NOT NULL,
    preview_fileobj_id integer,
    preview_description character varying,
    CONSTRAINT resource_social_pkey PRIMARY KEY (resource_id),
    CONSTRAINT resource_social_preview_fileobj_id_fkey FOREIGN KEY (preview_fileobj_id)
        REFERENCES fileobj (id),
    CONSTRAINT resource_social_resource_id_fkey FOREIGN KEY (resource_id)
        REFERENCES resource (id)
);

COMMENT ON TABLE resource_social IS 'social';
