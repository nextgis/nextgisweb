/*** { "revision": "2d9056c4" } ***/

UPDATE setting SET component = 'core'
WHERE component = 'webmap' and name IN ('degree_format', 'measurement_srid');

INSERT INTO setting (component, name, value)
VALUES ('core', 'units', '"metric"');

DELETE FROM setting
WHERE component = 'webmap' and name IN ('units_length', 'units_area');
