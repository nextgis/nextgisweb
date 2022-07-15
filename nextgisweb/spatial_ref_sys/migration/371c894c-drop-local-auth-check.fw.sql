/*** {
    "revision": "371c894c", "parents": ["33b8836e"],
    "date": "2022-07-15T03:05:48",
    "message": "Drop local auth check"
} ***/

ALTER TABLE srs DROP CONSTRAINT IF EXISTS srs_id_auth_check;
