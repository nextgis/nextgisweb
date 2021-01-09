/*** {
    "revision": "2b6f2dd2", "parents": ["00000000"],
    "date": "2020-12-09T00:00:00",
    "message": "Add insecure column"
} ***/

ALTER TABLE tmsclient_connection
    ADD COLUMN insecure boolean NOT NULL DEFAULT false;