/*** {
    "revision": "38dc8c21", "parents": ["35f4315f"],
    "date": "2022-10-10T12:31:24",
    "message": "User alink token"
} ***/

ALTER TABLE auth_user ADD COLUMN alink_token character varying UNIQUE;
