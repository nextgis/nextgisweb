/*** {
    "revision": "390b25ab", "parents": ["38dc8c21"],
    "date": "2022-10-19T14:41:12",
    "message": "JSONB token data"
} ***/

ALTER TABLE auth_oauth_token ALTER COLUMN data TYPE jsonb USING data::jsonb;
