/*** {
    "revision": "00dc6f80", "parents": ["00000000"],
    "date": "2015-02-13T00:00:00",
    "message": "Version constraint"
} ***/

ALTER TABLE wmsclient_connection DROP CONSTRAINT IF EXISTS wmsclient_connection_version_check;
ALTER TABLE wmsclient_connection DROP CONSTRAINT IF EXISTS wmsclient_connection_version_check1;

ALTER TABLE wmsclient_connection 
    ADD CONSTRAINT wmsclient_connection_version_check CHECK (version IN ('1.1.1', '1.3.0'));