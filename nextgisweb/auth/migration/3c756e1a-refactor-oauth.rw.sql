/*** { "revision": "3c756e1a" } ***/

-- Table: auth_oauth_token

DROP TABLE IF EXISTS auth_oauth_atoken;
CREATE TABLE auth_oauth_token (
	id text PRIMARY KEY,
	exp timestamp without time zone NOT NULL,
	sub text NOT NULL,
	data jsonb NOT NULL
);

COMMENT ON TABLE auth_oauth_token IS 'auth';

-- Table: auth_oauth_password_token

DROP TABLE IF EXISTS auth_oauth_ptoken;
CREATE TABLE auth_oauth_password_token (
	id text PRIMARY KEY,
	access_token text NOT NULL,
	exp timestamp without time zone NOT NULL,
	refresh_token text NOT NULL,
	refresh_exp timestamp without time zone NOT NULL
);

COMMENT ON TABLE auth_oauth_password_token IS 'auth';

-- Delete sessions and data

TRUNCATE pyramid_session, pyramid_session_store;