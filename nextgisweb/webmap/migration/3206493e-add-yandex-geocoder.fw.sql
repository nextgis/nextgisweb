/*** {
    "revision": "3206493e", "parents": ["2cee4e63"],
    "date": "2021-11-03T02:25:45",
    "message": "Add Yandex geocoder"
} ***/

UPDATE setting
SET value = CASE WHEN value = '"on"' THEN 'true' ELSE 'false' END,
    name  = 'address_search_enabled'
WHERE component = 'webmap'
  AND name = 'nominatim_enabled';

UPDATE setting
SET value = CASE WHEN value = '"on"' THEN 'true' ELSE 'false' END,
    name  = 'address_search_extent'
WHERE component = 'webmap'
  AND name = 'nominatim_extent';
