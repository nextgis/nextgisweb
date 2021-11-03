/*** {
    "revision": "3206493e", "parents": ["2cee4e63"],
    "date": "2021-11-03T02:25:45",
    "message": "Add Yandex geocoder"
} ***/

DO
$do$
    BEGIN
        -- Get old "nominatim_enabled" value
        -- Put the value in "address_search_enabled"
        -- Remove old "nominatim_enabled"
        IF EXISTS(
                SELECT 1
                FROM setting s
                WHERE s.component = 'webmap'
                  AND name = 'nominatim_enabled')
        THEN
            INSERT INTO setting (component, name, value)
            SELECT component, 'address_search_enabled', value = '"on"'
            FROM setting
            WHERE component = 'webmap'
              AND name = 'nominatim_enabled';

            DELETE
            FROM setting
            WHERE component = 'webmap'
              AND name = 'nominatim_enabled';
        END IF;

        -- Get old "nominatim_extent" value
        -- Put the value in "address_search_extent"
        -- Remove old "nominatim_extent"
        IF EXISTS(
                SELECT 1
                FROM setting s
                WHERE s.component = 'webmap'
                  AND name = 'nominatim_extent')
        THEN
            INSERT INTO setting (component, name, value)
            SELECT component, 'address_search_extent', value = '"on"'
            FROM setting
            WHERE component = 'webmap'
              AND name = 'nominatim_extent';

            DELETE
            FROM setting
            WHERE component = 'webmap'
              AND name = 'nominatim_extent';
        END IF;
    END
$do$
