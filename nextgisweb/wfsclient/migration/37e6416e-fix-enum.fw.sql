/*** {
    "revision": "37e6416e", "parents": ["00000000"],
    "date": "2022-08-23T11:28:25",
    "message": "Fix enum"
} ***/

ALTER TABLE wfsclient_connection DROP CONSTRAINT IF EXISTS wfsclient_connection_version_check;
ALTER TABLE wfsclient_connection ALTER COLUMN version TYPE character varying(50);

ALTER TABLE wfsclient_layer DROP CONSTRAINT IF EXISTS wfsclient_layer_geometry_type_check;
ALTER TABLE wfsclient_layer ALTER COLUMN geometry_type TYPE character varying(50);
