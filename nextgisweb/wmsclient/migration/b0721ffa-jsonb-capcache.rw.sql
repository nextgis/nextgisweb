/*** { "revision": "b0721ffa" } ***/

ALTER TABLE wmsclient_connection
    ALTER COLUMN capcache_json TYPE character varying USING capcache_json::text;
