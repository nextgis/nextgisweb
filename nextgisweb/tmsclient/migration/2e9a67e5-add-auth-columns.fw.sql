/*** {
    "revision": "2e9a67e5", "parents": ["2b6f2dd2"],
    "date": "2021-05-16T05:52:21",
    "message": "add-auth-columns"
} ***/

ALTER TABLE tmsclient_connection ADD COLUMN username character varying;
ALTER TABLE tmsclient_connection ADD COLUMN password character varying;
