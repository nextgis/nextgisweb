/*** {
    "revision": "37e63d4b", "parents": ["2e9a67e5"],
    "date": "2022-08-23T11:23:53",
    "message": "Fix enum"
} ***/

ALTER TABLE tmsclient_connection DROP CONSTRAINT IF EXISTS tmsclient_connection_capmode_check;
ALTER TABLE tmsclient_connection ALTER COLUMN capmode TYPE character varying(50);
ALTER TABLE tmsclient_connection DROP CONSTRAINT IF EXISTS tmsclient_connection_scheme_check;
ALTER TABLE tmsclient_connection ALTER COLUMN scheme TYPE character varying(50);
