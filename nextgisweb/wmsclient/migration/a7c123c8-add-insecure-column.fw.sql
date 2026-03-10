/*** {
    "revision": "a7c123c8", "parents": ["3df5a71f"],
    "date": "2026-03-10T00:00:00",
    "message": "Add insecure column"
} ***/

ALTER TABLE wmsclient_connection
    ADD COLUMN insecure boolean NOT NULL DEFAULT false;
