/*** {
    "revision": "55b36995", "parents": ["b0721ffa"],
    "date": "2026-09-19T16:26:40",
    "message": "Fix migration defaults"
} ***/

ALTER TABLE wmsclient_connection ALTER COLUMN insecure DROP DEFAULT;
