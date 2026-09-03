/*** {
    "revision": "55599010", "parents": ["51aa8784"],
    "date": "2026-09-02T03:48:02",
    "message": "Deletion date"
} ***/

ALTER TABLE resource ADD COLUMN deletion_date timestamp without time zone;
