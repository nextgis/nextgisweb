SELECT
    et.version_id AS vid
FROM simple_et AS et
WHERE
    et.resource_id = :p_rid AND et.feature_id = :p_fid;
