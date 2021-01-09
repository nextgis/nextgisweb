/*** { "revision": "05778268" } ***/

ALTER TABLE auth_principal DROP COLUMN description;
ALTER TABLE auth_user DROP COLUMN superuser;
ALTER TABLE auth_user DROP COLUMN disabled;
