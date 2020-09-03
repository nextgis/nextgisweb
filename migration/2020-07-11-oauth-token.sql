CREATE TABLE auth_oauth_token
(
    id character varying NOT NULL,
    exp timestamp without time zone NOT NULL,
    sub character varying NOT NULL,
    data character varying NOT NULL,
    CONSTRAINT auth_oauth_token_pkey PRIMARY KEY (id)
);

COMMENT ON TABLE auth_oauth_token IS 'auth';