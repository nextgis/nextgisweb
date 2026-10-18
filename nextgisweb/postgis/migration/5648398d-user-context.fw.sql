/*** {
    "revision": "5648398d", "parents": ["4836e6df"],
    "date": "2026-10-18T17:07:50",
    "message": "User context flag"
} ***/

ALTER TABLE postgis_connection ADD COLUMN user_context boolean NOT NULL DEFAULT false;
ALTER TABLE postgis_connection ALTER COLUMN user_context DROP DEFAULT;
