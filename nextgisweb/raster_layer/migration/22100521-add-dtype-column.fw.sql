/*** {
    "revision": "22100521", "parents": ["00000000"],
    "date": "2019-08-29T00:00:00",
    "message": "Add dtype column"
} ***/

ALTER TABLE raster_layer ADD COLUMN dtype
    character varying;

UPDATE raster_layer SET dtype = 'Byte';

ALTER TABLE raster_layer ALTER COLUMN dtype
    SET NOT NULL;