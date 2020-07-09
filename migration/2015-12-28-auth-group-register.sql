ALTER TABLE auth_group ADD COLUMN register boolean;
UPDATE auth_group SET register = FALSE;
ALTER TABLE auth_group ALTER COLUMN register SET NOT NULL;
