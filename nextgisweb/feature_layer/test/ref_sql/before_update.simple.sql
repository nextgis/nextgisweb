WITH cs AS (
    SELECT
        simple_et.resource_id AS resource_id,
        simple_et.feature_id AS feature_id,
        simple_et.version_id AS version_id,
        simple_et.version_op AS version_op,
        :p_vid AS version_nid,
        :p_vop AS version_nop,
        value
    FROM simple_et, simple
    WHERE
        simple_et.resource_id = :p_rid
        AND simple_et.feature_id = :p_fid
        AND simple.resource_id = simple_et.resource_id
        AND simple.feature_id = simple_et.feature_id
), hi AS (
    INSERT INTO simple_ht (
        resource_id,
        feature_id,
        version_id,
        version_op,
        version_nid,
        version_nop,
        value
    )
    SELECT
        cs.resource_id AS resource_id,
        cs.feature_id AS feature_id,
        cs.version_id AS version_id,
        cs.version_op AS version_op,
        cs.version_nid AS version_nid,
        cs.version_nop AS version_nop,
        cs.value
    FROM cs
    RETURNING simple_ht.resource_id, simple_ht.feature_id
)
UPDATE simple_et SET version_id = :p_vid, version_op = :p_vop
FROM hi
WHERE
    simple_et.resource_id = hi.resource_id AND simple_et.feature_id = hi.feature_id
RETURNING simple_et.resource_id, simple_et.feature_id;
