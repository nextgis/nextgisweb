/*** {
    "revision": "4ad6cff8", "parents": ["00000000"],
    "date": "2025-03-26T06:40:27",
    "message": "Sorted value"
} ***/

ALTER TABLE lookup_table ADD COLUMN value jsonb;

UPDATE lookup_table SET value = CASE
    WHEN val IS NOT NULL THEN jsonb_build_array(%# val)->0
    ELSE '[]'::jsonb
END;

ALTER TABLE lookup_table ALTER COLUMN value SET NOT NULL;
ALTER TABLE lookup_table DROP COLUMN val;

ALTER TABLE lookup_table ADD COLUMN sort character varying(50);
UPDATE lookup_table SET sort = 'KEY_ASC';
ALTER TABLE lookup_table ALTER COLUMN sort SET NOT NULL;
