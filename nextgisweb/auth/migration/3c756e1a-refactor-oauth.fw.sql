/*** {
    "revision": "3c756e1a", "parents": ["39b20e77"],
    "date": "2023-04-08T03:45:55",
    "message": "Refactor OAuth"
} ***/

-- Table: auth_oauth_atoken

DROP TABLE IF EXISTS auth_oauth_token;
CREATE TABLE auth_oauth_atoken (
	id text PRIMARY KEY,
	exp bigint NOT NULL,
	sub text NOT NULL,
	data jsonb NOT NULL
);

COMMENT ON TABLE auth_oauth_atoken IS 'auth';

-- Table: auth_oauth_ptoken

DROP TABLE IF EXISTS auth_oauth_password_token;
CREATE TABLE auth_oauth_ptoken (
	id text PRIMARY KEY,
	tstamp bigint NOT NULL,
	user_id integer NOT NULL,
	access_token text NOT NULL,
	access_exp bigint NOT NULL,
	refresh_token text NOT NULL,
	refresh_exp bigint NOT NULL,
    CONSTRAINT auth_oauth_password_token_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES auth_principal(id) ON DELETE CASCADE
);

COMMENT ON TABLE auth_oauth_ptoken IS 'auth';

-- Delete sessions and data

TRUNCATE pyramid_session, pyramid_session_store;