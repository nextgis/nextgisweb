/*** {
    "revision": "436507ae", "parents": ["39374be0"],
    "date": "2024-03-19T12:29:10",
    "message": "Store MIME type with logo"
} ***/

UPDATE setting 
SET value = jsonb_build_array('image/png', value)
WHERE component = 'pyramid' AND name = 'logo';
