/*** {
    "revision": "37e64383", "parents": ["039ac0e2"],
    "date": "2022-08-23T11:30:42",
    "message": "Fix enum"
} ***/

ALTER TABLE wmsclient_connection DROP CONSTRAINT IF EXISTS wmsclient_connection_version_check;
ALTER TABLE wmsclient_connection ALTER COLUMN version TYPE character varying(50);
