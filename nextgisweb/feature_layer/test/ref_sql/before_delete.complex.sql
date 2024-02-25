WITH cs AS (
    SELECT
        complex_et.extension_id AS extension_id,
        complex_et.resource_id AS resource_id,
        complex_et.feature_id AS feature_id,
        complex_et.version_id AS version_id,
        complex_et.version_op AS version_op,
        :p_vid AS version_nid,
        :p_vop AS version_nop,
        column_a,
        column_b
    FROM complex_et, complex
    WHERE
        complex.id = complex_et.extension_id
        AND complex_et.extension_id = :p_eid
        AND complex_et.resource_id = :p_rid
        AND complex_et.feature_id = :p_fid
        AND complex.resource_id = complex_et.resource_id
        AND complex.feature_id = complex_et.feature_id
), hi AS (
    INSERT INTO complex_ht (
        extension_id,
        resource_id,
        feature_id,
        version_id,
        version_op,
        version_nid,
        version_nop,
        column_a,
        column_b
    )
    SELECT
        cs.extension_id AS extension_id,
        cs.resource_id AS resource_id,
        cs.feature_id AS feature_id,
        cs.version_id AS version_id,
        cs.version_op AS version_op,
        cs.version_nid AS version_nid,
        cs.version_nop AS version_nop,
        cs.column_a,
        column_b
    FROM cs
    RETURNING complex_ht.resource_id, complex_ht.feature_id, complex_ht.extension_id
)
UPDATE complex_et SET version_id = :p_vid, version_op = :p_vop
FROM hi
WHERE
    complex_et.resource_id = hi.resource_id
    AND complex_et.feature_id = hi.feature_id
    AND complex_et.extension_id = hi.extension_id
RETURNING complex_et.resource_id, complex_et.feature_id, complex_et.extension_id;
