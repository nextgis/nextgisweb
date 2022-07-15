/*** { "revision": "371c894c" } ***/

ALTER TABLE srs
    ADD CONSTRAINT srs_id_auth_check
    CHECK (auth_name IS NULL AND auth_srid IS NULL OR id < 990001);
