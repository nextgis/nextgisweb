/*** {
    "revision": "55b258dc", "parents": ["54e1e370"],
    "date": "2026-09-19T11:27:25",
    "message": "Change `text` column types to `character varying`"
} ***/

ALTER TABLE auth_principal
    ALTER COLUMN permissions TYPE character varying[],
    ALTER COLUMN permissions DROP DEFAULT;

ALTER TABLE auth_oauth_atoken
    ALTER COLUMN id TYPE character varying,
    ALTER COLUMN sub TYPE character varying;

ALTER TABLE auth_oauth_ptoken
    ALTER COLUMN id TYPE character varying,
    ALTER COLUMN access_token TYPE character varying,
    ALTER COLUMN refresh_token TYPE character varying;
