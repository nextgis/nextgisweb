/*** {
    "revision": "39b20e77", "parents": ["390b25ab"],
    "date": "2022-11-21T04:05:47",
    "message": "Group oauth_mapping column"
} ***/

ALTER TABLE auth_group ADD COLUMN oauth_mapping boolean;
UPDATE auth_group SET oauth_mapping = FALSE;
ALTER TABLE auth_group ALTER COLUMN oauth_mapping SET NOT NULL;
