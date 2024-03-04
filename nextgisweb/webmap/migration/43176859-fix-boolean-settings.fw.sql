/*** {
    "revision": "43176859", "parents": ["4315451d"],
    "date": "2024-03-04T09:05:09",
    "message": "Fix boolean settings"
} ***/

UPDATE setting SET value = CASE
    WHEN value::text IN ('"on"', 'true') THEN 'true'::jsonb
    ELSE 'false'::jsonb
END
WHERE component = 'webmap'
    AND name IN (
        'address_search_enabled',
        'address_search_extent',
        'hide_nav_menu',
        'identify_attributes',
        'show_geometry_info'
    );