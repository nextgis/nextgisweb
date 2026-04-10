WITH qet AS (
    SELECT
        simple_et.feature_id AS feature_id,
        simple_et.version_id AS version_id
    FROM simple_et
    WHERE
        simple_et.resource_id = :p_rid
        AND simple_et.feature_id = :p_fid
        AND simple_et.version_op = 'O'
), sht AS (
    SELECT
        qet.feature_id AS feature_id,
        qet.version_id AS version_id,
        simple_ht.value AS value
    FROM qet, simple_ht
    WHERE
        simple_ht.resource_id = :p_rid
        AND simple_ht.feature_id = qet.feature_id
        AND simple_ht.version_nid = qet.version_id
        AND simple_ht.version_nop = 'O'
), iht AS (
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
        :p_rid AS anon_1,
        sht.feature_id AS feature_id,
        sht.version_id AS version_id,
        'O',
        :p_vid AS anon_2,
        'R',
        sht.value AS value
    FROM sht
    RETURNING simple_ht.feature_id, simple_ht.value
), ict AS (
    INSERT INTO simple (
        resource_id,
        feature_id,
        value
    )
    SELECT
        :p_rid AS anon_1,
        iht.feature_id AS feature_id,
        iht.value AS value
    FROM iht
    RETURNING simple.feature_id
)
UPDATE simple_et SET version_id = :p_vid, version_op = 'R'
FROM ict
WHERE
    simple_et.resource_id = :p_rid AND simple_et.feature_id = ict.feature_id;
