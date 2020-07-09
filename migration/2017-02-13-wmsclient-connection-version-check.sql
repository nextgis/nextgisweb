ALTER TABLE wmsclient_connection DROP CONSTRAINT wmsclient_connection_version_check;
ALTER TABLE wmsclient_connection DROP CONSTRAINT wmsclient_connection_version_check1;
ALTER TABLE wmsclient_connection ADD CONSTRAINT wmsclient_connection_version_check CHECK (version IN ('1.1.1', '1.3.0'));