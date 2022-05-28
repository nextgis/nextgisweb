/*** {
    "revision": "35f4315f", "parents": ["3372ed9b"],
    "date": "2022-05-18T07:43:23",
    "message": "OAuth password token table"
} ***/

CREATE TABLE auth_oauth_password_token
(
    id character varying NOT NULL,
    access_token character varying NOT NULL,
    exp timestamp without time zone NOT NULL,
    refresh_token character varying NOT NULL,
    refresh_exp timestamp without time zone NOT NULL,
    CONSTRAINT auth_oauth_password_token_pkey PRIMARY KEY (id)
);

COMMENT ON TABLE auth_oauth_password_token IS 'auth';
