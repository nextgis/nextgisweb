/*** {
    "revision": "55b36a5e", "parents": ["54e21d79"],
    "date": "2026-09-19T16:27:32",
    "message": "Fix migration defaults"
} ***/

ALTER TABLE tmsclient_connection ALTER COLUMN insecure DROP DEFAULT;
