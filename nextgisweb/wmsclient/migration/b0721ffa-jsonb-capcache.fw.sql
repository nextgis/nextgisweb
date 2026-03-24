/*** {
    "revision": "b0721ffa", "parents": ["581f174c"],
    "date": "2026-03-24T00:00:00",
    "message": "JSONB capcache"
} ***/

ALTER TABLE wmsclient_connection
    ALTER COLUMN capcache_json TYPE jsonb USING capcache_json::jsonb;
