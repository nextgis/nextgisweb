/*** {
    "revision": "2d0ad4b8", "parents": ["28691765"],
    "date": "2021-02-27T07:12:23",
    "message": "Add auth_user_lower_keyname_idx"
} ***/

CREATE UNIQUE INDEX auth_user_lower_keyname_idx ON auth_user (lower(keyname));
