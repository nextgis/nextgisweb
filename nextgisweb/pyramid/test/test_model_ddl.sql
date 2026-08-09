/*** Table: pyramid_session ***/

CREATE TABLE pyramid_session (
    id character varying(32) NOT NULL,
    created timestamp without time zone NOT NULL,
    last_activity timestamp without time zone NOT NULL,
    PRIMARY KEY (id)
);

COMMENT ON TABLE pyramid_session IS 'pyramid';

/*** Table: pyramid_session_store ***/

CREATE TABLE pyramid_session_store (
    session_id character varying(32) NOT NULL,
    key character varying NOT NULL,
    value jsonb NOT NULL,
    PRIMARY KEY (session_id, key),
    FOREIGN KEY (session_id) REFERENCES pyramid_session (id) ON DELETE CASCADE
);

COMMENT ON TABLE pyramid_session_store IS 'pyramid';
