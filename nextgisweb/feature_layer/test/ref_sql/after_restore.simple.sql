WITH iht AS (
    INSERT INTO simple_ht (
        resource_id,
        version_id,
        feature_id,
        version_nid,
        version_op,
        version_nop
    )
    VALUES
        (:p_rid, :p_pid, :p_fid, :p_vid, :p_pop, 'R')
    RETURNING simple_ht.feature_id
)
UPDATE simple_et SET version_id = :p_vid, version_op = 'R'
FROM iht
WHERE
    simple_et.resource_id = :p_rid AND simple_et.feature_id = iht.feature_id;
