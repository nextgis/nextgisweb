WITH qet AS (
    SELECT
        complex_et.feature_id AS feature_id,
        complex_et.extension_id AS extension_id,
        complex_et.version_id AS version_id
    FROM complex_et
    WHERE
        complex_et.resource_id = :p_rid
        AND complex_et.feature_id = :p_fid
        AND complex_et.version_op = 'O'
), sht AS (
    SELECT
        qet.feature_id AS feature_id,
        qet.extension_id AS extension_id,
        qet.version_id AS version_id,
        complex_ht.column_a AS column_a,
        complex_ht.column_b AS column_b
    FROM qet, complex_ht
    WHERE
        complex_ht.resource_id = :p_rid
        AND complex_ht.feature_id = qet.feature_id
        AND complex_ht.version_nid = qet.version_id
        AND complex_ht.version_nop = 'O'
        AND complex_ht.extension_id = qet.extension_id
), iht AS (
    INSERT INTO complex_ht (
        resource_id,
        extension_id,
        feature_id,
        version_id,
        version_op,
        version_nid,
        version_nop,
        column_a,
        column_b
    )
    SELECT
        :p_rid AS anon_1,
        sht.extension_id AS extension_id,
        sht.feature_id AS feature_id,
        sht.version_id AS version_id,
        'O',
        :p_vid AS anon_2,
        'R',
        sht.column_a AS column_a,
        sht.column_b AS column_b
    FROM sht
    RETURNING complex_ht.feature_id, complex_ht.extension_id, complex_ht.column_a, complex_ht.column_b
), ict AS (
    INSERT INTO complex (
        resource_id,
        extension_id,
        feature_id,
        column_a,
        column_b
    )
    SELECT
        :p_rid AS anon_1,
        iht.extension_id AS extension_id,
        iht.feature_id AS feature_id,
        iht.column_a AS column_a,
        iht.column_b AS column_b
    FROM iht
    RETURNING complex.feature_id, complex.extension_id
)
UPDATE complex_et SET version_id = :p_vid, version_op = 'R'
FROM ict
WHERE
    complex_et.resource_id = :p_rid
    AND complex_et.feature_id = ict.feature_id
    AND complex_et.extension_id = ict.extension_id;
