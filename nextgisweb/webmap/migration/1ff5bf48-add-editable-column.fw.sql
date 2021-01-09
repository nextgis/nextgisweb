/*** {
    "revision": "1ff5bf48", "parents": ["16969697"],
    "date": "2019-05-16T00:00:00",
    "message": "Add editable column"
} ***/

ALTER TABLE webmap
    ADD COLUMN editable boolean DEFAULT FALSE;
