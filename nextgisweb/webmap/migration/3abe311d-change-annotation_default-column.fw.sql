/*** {
    "revision": "3abe311d", "parents": ["3a024e71"],
    "date": "2023-01-12T11:24:35",
    "message": "Change annotation_default column"
} ***/

ALTER TABLE webmap
ALTER COLUMN annotation_default
TYPE VARCHAR(50) USING annotation_default::VARCHAR(50);

UPDATE webmap
SET annotation_default = CASE
    WHEN annotation_default = 'true' THEN 'yes' ELSE 'no' END;
