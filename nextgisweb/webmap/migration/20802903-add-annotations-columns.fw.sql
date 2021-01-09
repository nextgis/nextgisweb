/*** {
    "revision": "20802903", "parents": ["1ff5bf48"],
    "date": "2019-06-12T00:00:00",
    "message": "Add annotations columns"
} ***/

ALTER TABLE webmap
    ADD COLUMN annotation_enabled boolean DEFAULT FALSE;

ALTER TABLE webmap
    ADD COLUMN annotation_default boolean DEFAULT FALSE;
