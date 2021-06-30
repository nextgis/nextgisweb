/*** {
    "revision": "2eeb41fd", "parents": ["2d0ad4b8"],
    "date": "2021-06-01T00:23:32",
    "message": "Add language column"
} ***/

ALTER TABLE auth_user ADD COLUMN language character varying;
