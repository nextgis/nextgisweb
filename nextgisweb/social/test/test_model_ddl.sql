/*** Table: resource_social ***/

CREATE TABLE resource_social (
    resource_id integer NOT NULL,
    preview_fileobj_id integer,
    preview_description character varying,
    PRIMARY KEY (resource_id),
    FOREIGN KEY (resource_id) REFERENCES resource (id),
    FOREIGN KEY (preview_fileobj_id) REFERENCES fileobj (id)
);

COMMENT ON TABLE resource_social IS 'social';
