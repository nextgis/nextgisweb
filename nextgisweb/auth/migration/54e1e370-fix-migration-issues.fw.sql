/*** {
    "revision": "54e1e370", "parents": ["43b64d85"],
    "date": "2026-08-09T19:31:42",
    "message": "Fix migration issues"
} ***/

UPDATE auth_principal SET permissions = ARRAY[]::text[] WHERE permissions IS NULL;

ALTER TABLE auth_principal ALTER COLUMN permissions SET NOT NULL;

ALTER TABLE auth_oauth_ptoken
    DROP CONSTRAINT IF EXISTS auth_oauth_password_token_user_id_fkey,
    DROP CONSTRAINT IF EXISTS auth_oauth_ptoken_user_id_fkey,
    ADD FOREIGN KEY (user_id) REFERENCES auth_principal (id) ON DELETE CASCADE;
