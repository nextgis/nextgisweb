SELECT
    simple.resource_id,
    simple.feature_id,
    simple.value
FROM simple
WHERE
    simple.resource_id = :p_rid AND simple.feature_id = :p_fid;
