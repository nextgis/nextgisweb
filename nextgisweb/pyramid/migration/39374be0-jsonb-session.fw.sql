/*** {
    "revision": "39374be0", "parents": ["368d12d1"],
    "date": "2022-10-28T05:22:40",
    "message": "JSONB session"
} ***/

ALTER TABLE pyramid_session_store ALTER COLUMN value TYPE jsonb USING value::jsonb;
