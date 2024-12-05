/*** {
    "revision": "4836e6df", "parents": ["37e639a6"],
    "date": "2024-11-15T05:01:50",
    "message": "SSL mode"
} ***/

ALTER TABLE postgis_connection ADD COLUMN sslmode character varying(50);
