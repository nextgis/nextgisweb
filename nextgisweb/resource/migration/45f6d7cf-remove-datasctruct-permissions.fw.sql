/*** {
    "revision": "45f6d7cf", "parents": ["45960792"],
    "date": "2024-07-25T20:07:48",
    "message": "Remove datasctruct permissions"
} ***/

DELETE FROM resource_acl_rule WHERE scope = 'datastruct';
