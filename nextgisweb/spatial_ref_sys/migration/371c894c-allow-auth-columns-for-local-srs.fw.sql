/*** {
    "revision": "371c894c", "parents": ["33b8836e"],
    "date": "2022-07-15T03:05:48",
    "message": "Allow auth columns for local SRS"
} ***/

ALTER TABLE srs DROP CONSTRAINT IF EXISTS srs_id_auth_check;
ALTER TABLE srs ADD CONSTRAINT srs_auth_unique UNIQUE (auth_name, auth_srid);
