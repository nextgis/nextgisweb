/*** {
    "revision": "390b25de", "parents": ["37e6401f"],
    "date": "2022-10-19T14:41:25",
    "message": "JSONB annotation style"
} ***/

ALTER TABLE webmap_annotation ALTER COLUMN style TYPE jsonb USING style::jsonb;
