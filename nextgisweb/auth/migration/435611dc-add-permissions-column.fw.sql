/*** {
    "revision": "435611dc", "parents": ["3c756e1a"],
    "date": "2024-03-16T14:26:51",
    "message": "Add permissions column"
} ***/

ALTER TABLE auth_principal
    ADD COLUMN permissions text[] NOT NULL DEFAULT ARRAY[]::TEXT[];
