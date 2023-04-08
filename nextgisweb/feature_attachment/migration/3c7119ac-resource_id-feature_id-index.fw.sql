/*** {
    "revision": "3c7119ac", "parents": ["00000000"],
    "date": "2023-04-07T07:29:41",
    "message": "resource_id, feature_id index"
} ***/

CREATE INDEX feature_attachment_resource_id_feature_id_idx
    ON feature_attachment (resource_id, feature_id);
