/*** {
    "revision": "0ab32bbc", "parents": ["a7c123c8"],
    "date": "2026-03-10T00:00:00",
    "message": "Add referer column"
} ***/

ALTER TABLE wmsclient_connection
    ADD COLUMN referer character varying;
