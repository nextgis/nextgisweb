/*** {
    "revision": "24d8973b", "parents": ["073aa220"],
    "date": "2020-01-15T00:00:00",
    "message": "Add user 'oauth_subject' column"
} ***/

ALTER TABLE auth_user ADD COLUMN oauth_subject character varying UNIQUE;