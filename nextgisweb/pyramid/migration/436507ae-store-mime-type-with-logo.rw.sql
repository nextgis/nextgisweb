/*** { "revision": "436507ae" } ***/

UPDATE setting 
SET value = (jsonb_array_elements_text(value) ->> 1)::jsonb
WHERE component = 'pyramid' AND name = 'logo';
