/*** {
    "revision": "4c825100", "parents": ["37e63d4b"],
    "date": "2026-03-10T00:00:00",
    "message": "Add referer column"
} ***/

ALTER TABLE tmsclient_connection
    ADD COLUMN referer character varying;
