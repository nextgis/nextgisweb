CREATE TABLE pyramid_session (
    id character varying(32) NOT NULL,
    created timestamp without time zone NOT NULL,
    last_activity timestamp without time zone NOT NULL,
    CONSTRAINT pyramid_session_pkey PRIMARY KEY (id)
);

CREATE TABLE pyramid_session_store (
    session_id character varying(32) NOT NULL,
    key character varying NOT NULL,
    value character varying NOT NULL,
    CONSTRAINT pyramid_session_store_pkey PRIMARY KEY (session_id, key),
    CONSTRAINT pyramid_session_store_session_id_fkey FOREIGN KEY (session_id)
        REFERENCES pyramid_session (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE
);

COMMENT ON TABLE pyramid_session IS 'pyramid';
COMMENT ON TABLE pyramid_session_store IS 'pyramid';
