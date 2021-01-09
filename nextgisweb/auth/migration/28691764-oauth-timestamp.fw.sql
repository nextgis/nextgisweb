/*** {
    "revision": "28691764", "parents": ["27e8ee61"],
    "date": "2020-07-11T00:00:00",
    "message": "OAuth timestamp"
} ***/

ALTER TABLE auth_user ADD COLUMN oauth_tstamp timestamp without time zone;