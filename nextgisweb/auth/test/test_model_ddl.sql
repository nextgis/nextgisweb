/*** Table: auth_group ***/

CREATE TABLE auth_group (
    principal_id integer NOT NULL,
    keyname character varying,
    register boolean NOT NULL,
    oauth_mapping boolean NOT NULL,
    PRIMARY KEY (principal_id),
    FOREIGN KEY (principal_id) REFERENCES auth_principal (id),
    UNIQUE (keyname)
);

COMMENT ON TABLE auth_group IS 'auth';

/*** Table: auth_group_user ***/

CREATE TABLE auth_group_user (
    group_id integer NOT NULL,
    user_id integer NOT NULL,
    PRIMARY KEY (group_id, user_id),
    FOREIGN KEY (group_id) REFERENCES auth_group (principal_id),
    FOREIGN KEY (user_id) REFERENCES auth_user (principal_id)
);

COMMENT ON TABLE auth_group_user IS 'auth';

/*** Table: auth_oauth_atoken ***/

CREATE TABLE auth_oauth_atoken (
    id character varying NOT NULL,
    exp bigint NOT NULL,
    sub character varying NOT NULL,
    data jsonb NOT NULL,
    PRIMARY KEY (id)
);

COMMENT ON TABLE auth_oauth_atoken IS 'auth';

/*** Table: auth_oauth_ptoken ***/

CREATE TABLE auth_oauth_ptoken (
    id character varying NOT NULL,
    tstamp bigint NOT NULL,
    user_id integer NOT NULL,
    access_token character varying NOT NULL,
    access_exp bigint NOT NULL,
    refresh_token character varying NOT NULL,
    refresh_exp bigint NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (user_id) REFERENCES auth_principal (id) ON DELETE CASCADE
);

COMMENT ON TABLE auth_oauth_ptoken IS 'auth';

/*** Table: auth_principal ***/

CREATE TABLE auth_principal (
    id integer NOT NULL,
    cls character varying(1) NOT NULL,
    system boolean NOT NULL,
    display_name character varying NOT NULL,
    description character varying,
    permissions character varying[] NOT NULL,
    PRIMARY KEY (id)
);

COMMENT ON TABLE auth_principal IS 'auth';

CREATE UNIQUE INDEX auth_principal_cls_lower_display_name_idx ON auth_principal(cls, LOWER(display_name));

/*** Table: auth_user ***/

CREATE TABLE auth_user (
    principal_id integer NOT NULL,
    keyname character varying,
    superuser boolean NOT NULL,
    disabled boolean NOT NULL,
    password_hash character varying,
    oauth_subject character varying,
    oauth_tstamp timestamp without time zone,
    alink_token character varying,
    last_activity timestamp without time zone,
    language character varying,
    PRIMARY KEY (principal_id),
    FOREIGN KEY (principal_id) REFERENCES auth_principal (id),
    UNIQUE (keyname),
    UNIQUE (oauth_subject),
    UNIQUE (alink_token)
);

COMMENT ON TABLE auth_user IS 'auth';

CREATE UNIQUE INDEX auth_user_lower_keyname_idx ON auth_user(LOWER(keyname));
