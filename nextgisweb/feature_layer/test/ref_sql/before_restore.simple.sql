WITH qet AS (
    SELECT
        et.feature_id AS feature_id,
        NULL AS extension_id,
        et.version_id AS version_id
    FROM simple_et AS et
    WHERE
        et.resource_id = :p_rid AND et.feature_id = :p_fid AND et.version_op = 'D'
)
SELECT
    ht.feature_id,
    NULL AS extension_id,
    ht.version_nid,
    ht.version_nop,
    ht.value
FROM simple_ht AS ht, qet
WHERE
    ht.resource_id = :p_rid
    AND ht.feature_id = qet.feature_id
    AND (
        int4range(ht.version_id, ht.version_nid) && int4range(qet.version_id - 1, qet.version_id)
    );
