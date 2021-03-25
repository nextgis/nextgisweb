/*** {
    "revision": "2d9056c4", "parents": ["00000000"],
    "date": "2021-03-25T08:14:34",
    "message": "Move measurement settings"
} ***/

UPDATE setting SET component = 'webmap'
WHERE component = 'core' and name IN ('degree_format', 'measurement_srid');

INSERT INTO setting (component, name, value)
SELECT 'webmap', unnest(ARRAY['units_length', 'units_area']), value
FROM setting
WHERE component = 'core' and name = 'units';

DELETE FROM setting
WHERE component = 'core' and name = 'units';
