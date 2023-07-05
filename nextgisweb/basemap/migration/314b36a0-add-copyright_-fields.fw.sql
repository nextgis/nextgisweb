/*** {
    "revision": "314b36a0", "parents": ["00000000"],
    "date": "2021-09-27T14:37:19",
    "message": "Add copyright_* fields"
} ***/

ALTER TABLE basemap_layer ADD COLUMN copyright_text text;
ALTER TABLE basemap_layer ADD COLUMN copyright_url text;
