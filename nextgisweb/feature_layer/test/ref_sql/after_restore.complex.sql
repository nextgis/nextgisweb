WITH iht AS (
    INSERT INTO complex_ht (
        resource_id,
        version_id,
        feature_id,
        extension_id,
        version_nid,
        version_op,
        version_nop
    )
    VALUES
        (:p_rid, :p_pid, :p_fid, :p_eid, :p_vid, :p_pop, 'R')
    RETURNING complex_ht.feature_id
)
UPDATE complex_et SET version_id = :p_vid, version_op = 'R'
FROM iht
WHERE
    complex_et.resource_id = :p_rid
    AND complex_et.feature_id = iht.feature_id
    AND complex_et.extension_id = :p_eid;
