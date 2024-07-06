/*** {
    "revision": "45960792", "parents": ["45820e29"],
    "date": "2024-07-06T22:53:04",
    "message": "Remove metadata scope"
} ***/

DELETE FROM resource_acl_rule WHERE scope = 'metadata';
