/*** { "revision": "43cf2875" } ***/

-- TODO: Write code here and remove this placeholder line!

ALTER TABLE webmap
DROP CONSTRAINT IF EXISTS webmap_measure_srs_id_fkey;

ALTER TABLE webmap
DROP COLUMN IF EXISTS measure_srs_id;
