SELECT
    ht.version_id,
    ht.value
FROM simple_ht AS ht
WHERE
    int4range(ht.resource_id, ht.resource_id, '[]') @> :p_rid
    AND int4range(ht.version_id, ht.version_nid) @> :p_vid
    AND int4range(ht.feature_id, ht.feature_id, '[]') @> :p_fid
UNION ALL
SELECT
    et.version_id,
    ct.value
FROM simple_et AS et
LEFT OUTER JOIN simple AS ct
    ON ct.resource_id = et.resource_id
    AND ct.feature_id = et.feature_id
    AND ct.resource_id = et.resource_id
WHERE
    et.feature_id = :p_fid AND et.resource_id = :p_rid AND et.version_id <= :p_vid;
