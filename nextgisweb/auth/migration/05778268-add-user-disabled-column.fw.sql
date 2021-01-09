/*** {
    "revision": "05778268", "parents": ["00000000"],
    "date": "2015-10-01T00:00:00",
    "message": "Add description, disabled and superuser columns"
} ***/

ALTER TABLE auth_principal ADD COLUMN description character varying;
ALTER TABLE auth_user ADD COLUMN superuser boolean;
ALTER TABLE auth_user ADD COLUMN disabled boolean;

UPDATE auth_user SET superuser = FALSE;
UPDATE auth_user SET disabled = FALSE;

ALTER TABLE auth_user ALTER COLUMN superuser SET NOT NULL;
ALTER TABLE auth_user ALTER COLUMN disabled SET NOT NULL;
