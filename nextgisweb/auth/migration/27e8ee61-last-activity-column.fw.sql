/*** {
    "revision": "27e8ee61", "parents": ["24d8973b"],
    "date": "2020-06-16T00:00:00",
    "message": "Last activity column"
} ***/

ALTER TABLE auth_user ADD COLUMN last_activity timestamp without time zone;