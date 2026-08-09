/*** {
    "revision": "54e21d79", "parents": ["4c825100"],
    "date": "2026-08-09T20:35:23",
    "message": "Fix tmsclient_connection.insecure default"
} ***/

UPDATE tmsclient_connection SET insecure = false WHERE insecure IS NULL;

ALTER TABLE tmsclient_connection ALTER COLUMN insecure SET NOT NULL;
