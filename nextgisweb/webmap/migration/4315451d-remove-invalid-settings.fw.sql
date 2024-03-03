/*** {
    "revision": "4315451d", "parents": ["3e366d86"],
    "date": "2024-03-03T23:04:42",
    "message": "Remove invalid settings"
} ***/

DELETE FROM setting
WHERE component = 'webmap' AND (
    (name = 'units_length' AND value::text NOT IN ('"m"', '"km"', '"metric"', '"ft"', '"mi"', '"imperial"'))
    OR (name = 'units_area' AND value::text NOT IN ('"sq_m"', '"sq_km"', '"metric"', '"ha"', '"ac"', '"sq_mi"', '"imperial"', '"sq_ft"'))
    OR (name = 'degree_format' AND value::text NOT IN ('"dd"', '"ddm"', '"dms"'))
    OR (name = 'address_geocoder' AND value::text NOT IN ('"nominatim"', '"yandex"'))
);
