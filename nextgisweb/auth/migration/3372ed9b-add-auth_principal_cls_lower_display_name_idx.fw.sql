/*** {
    "revision": "3372ed9b", "parents": ["2eeb41fd"],
    "date": "2022-01-13T05:33:08",
    "message": "Add auth_principal_cls_lower_display_name_idx"
} ***/

-- Make existing display names unique and add the constraint then.

DO $$
DECLARE
    row record;
    suffix int;
    candidate text;
    conflict_count int;
BEGIN
    FOR row IN (
        SELECT id, display_name, cls
        FROM auth_principal a WHERE EXISTS(
            SELECT * FROM auth_principal b
            WHERE a.id > b.id AND a.cls = b.cls
                AND lower(a.display_name) = lower(b.display_name)
        )
    ) LOOP
        suffix := 1;

        -- The nested loop is required to handle cases like: user, user, user_1.
        -- Without this loop it will rename user to user_1, which will conflict
        -- with existing user_1 record.

        WHILE true LOOP
            candidate := CONCAT(row.display_name, '_', suffix);

            SELECT COUNT(*) INTO conflict_count
            FROM auth_principal
            WHERE cls = row.cls AND lower(display_name) = lower(candidate);

            IF conflict_count = 0 THEN
                UPDATE auth_principal
                SET display_name = candidate
                WHERE id = row.id;
                EXIT;
            ELSE
                suffix := suffix + 1;
            END IF;
        END LOOP;
    END LOOP;
END $$;

CREATE UNIQUE INDEX auth_principal_cls_lower_display_name_idx
    ON auth_principal (cls, lower(display_name));
