/*** {
    "revision": "45999710", "parents": ["43cf2875"],
    "date": "2024-07-07T15:33:12",
    "message": "Remove webmap:display permission"
} ***/

DELETE FROM resource_acl_rule WHERE scope='webmap' AND permission = 'display';
