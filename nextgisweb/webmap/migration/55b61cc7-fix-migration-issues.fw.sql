/*** {
    "revision": "55b61cc7", "parents": ["55b35a8a"],
    "date": "2026-09-20T05:05:05",
    "message": "Fix migration issues"
} ***/

UPDATE webmap SET editable = TRUE WHERE editable IS NULL;

ALTER TABLE webmap ALTER COLUMN editable SET NOT NULL;

DO $$
DECLARE
    tab regclass := 'webmap_item'::regclass;
    col text := 'item_type';
    r record;
BEGIN
    FOR r IN
        SELECT conname FROM pg_constraint
        WHERE contype = 'c'
            AND conrelid = tab
            AND conkey = ARRAY[(
                SELECT attnum FROM pg_attribute
                WHERE attrelid = tab
                    AND attname = col
                    AND NOT attisdropped
            )]
    LOOP
        EXECUTE format(
            'ALTER TABLE %s DROP CONSTRAINT %I',
            tab, r.conname
        );
    END LOOP;
END $$;
