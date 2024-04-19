/*** {
    "revision": "43cf2875", "parents": ["43176859"],
    "date": "2024-04-09T05:20:21",
    "message": "Add measure_srs_id"
} ***/

ALTER TABLE webmap ADD COLUMN measure_srs_id INTEGER NULL;

ALTER TABLE webmap
ADD CONSTRAINT webmap_measure_srs_id_fkey
FOREIGN KEY (measure_srs_id)
REFERENCES srs(id)
ON DELETE SET NULL;
