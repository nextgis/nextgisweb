/*** {
    "revision": "073aa220", "parents": ["05778268"],
    "date": "2015-12-28T00:00:00",
    "message": "Add group 'register' column"
} ***/

ALTER TABLE auth_group ADD COLUMN register boolean;
UPDATE auth_group SET register = FALSE;
ALTER TABLE auth_group ALTER COLUMN register SET NOT NULL;