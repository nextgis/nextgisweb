/*** { "revision": "3abe311d" } ***/

UPDATE webmap
SET annotation_default = CASE
    WHEN annotation_default = 'messages' OR annotation_default = 'yes' THEN 'true' ELSE 'false' END;

ALTER TABLE webmap
ALTER COLUMN annotation_default
TYPE BOOLEAN USING annotation_default::BOOLEAN;
