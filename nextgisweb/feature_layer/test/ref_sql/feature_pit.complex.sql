SELECT
    ht.feature_id,
    ht.extension_id,
    ht.version_id,
    ht.column_a,
    ht.column_b
FROM complex_ht AS ht
WHERE
    int4range(ht.resource_id, ht.resource_id, '[]') @> :p_rid
    AND int4range(ht.version_id, ht.version_nid) @> :p_vid
    AND int4range(ht.feature_id, ht.feature_id, '[]') @> :p_fid
UNION ALL
SELECT
    et.feature_id,
    et.extension_id,
    et.version_id,
    ct.column_a,
    ct.column_b
FROM complex_et AS et
LEFT OUTER JOIN complex AS ct
    ON ct.resource_id = et.resource_id
    AND ct.feature_id = et.feature_id
    AND ct.id = et.extension_id
WHERE
    et.resource_id = :p_rid AND et.feature_id = :p_fid AND et.version_id <= :p_vid;
