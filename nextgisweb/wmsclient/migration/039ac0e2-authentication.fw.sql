/*** {
    "revision": "039ac0e2", "parents": ["00dc6f80"],
    "date": "2015-06-30T00:00:00",
    "message": "Authentication"
} ***/

ALTER TABLE wmsclient_connection
    ADD COLUMN username character varying;
ALTER TABLE wmsclient_connection
    ADD COLUMN password character varying;