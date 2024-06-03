SELECT
    ht.extension_id,
    ht.version_id,
    ht.column_a,
    ht.column_b
FROM complex_ht AS ht
WHERE
    int4range(resource_id, resource_id, '[]') @> :p_rid
    AND int4range(version_id, version_nid) @> :p_vid
    AND int4range(feature_id, feature_id, '[]') @> :p_fid
UNION ALL
SELECT
    et.extension_id,
    et.version_id,
    ct.column_a,
    ct.column_b
FROM complex_et AS et
JOIN complex AS ct
    ON ct.resource_id = et.resource_id
    AND ct.feature_id = et.feature_id
    AND ct.id = et.extension_id
WHERE
    et.feature_id = :p_fid AND et.resource_id = :p_rid AND et.version_id <= :p_vid;
