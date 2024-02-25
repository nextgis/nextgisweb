SELECT DISTINCT
    et.feature_id AS fid
FROM simple_et AS et
WHERE
    et.resource_id = :p_rid
    AND et.version_id > :p_initial
    AND et.version_id <= :p_target
    AND (
        :p_fid_last IS NULL OR et.feature_id > :p_fid_last
    )
ORDER BY
    et.feature_id
LIMIT :p_fid_limit;

SELECT DISTINCT
    ht.feature_id AS fid
FROM simple_ht AS ht
WHERE
    ht.resource_id = :p_rid
    AND ht.version_id > :p_initial
    AND ht.version_id <= :p_target
    AND (
        :p_fid_last IS NULL OR ht.feature_id > :p_fid_last
    )
ORDER BY
    ht.feature_id
LIMIT :p_fid_limit;
