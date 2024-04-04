/*** {
    "revision": "43b64d85", "parents": ["435611dc"],
    "date": "2024-04-04T08:58:34",
    "message": "Fix system group"
} ***/

UPDATE auth_principal
SET system = true
FROM auth_group g
WHERE
    g.principal_id = id
	AND g.keyname = 'administrators'
    AND cls = 'G'
    AND NOT system
