INSERT INTO simple (
    resource_id,
    feature_id,
    value
)
SELECT
    :p_rid AS resource_id,
    pit.feature_id,
    pit.value
FROM (
    SELECT
        ht.feature_id AS feature_id,
        ht.version_id AS version_id,
        ht.value AS value
    FROM simple_ht AS ht
    WHERE
        int4range(ht.resource_id, ht.resource_id, '[]') @> :p_sid
        AND int4range(ht.version_id, ht.version_nid) @> :p_vid
    UNION ALL
    SELECT
        et.feature_id AS feature_id,
        et.version_id AS version_id,
        ct.value AS value
    FROM simple_et AS et
    LEFT OUTER JOIN simple AS ct
        ON ct.resource_id = et.resource_id
        AND ct.feature_id = et.feature_id
        AND ct.resource_id = et.resource_id
    WHERE
        et.resource_id = :p_sid AND et.version_id <= :p_vid
) AS pit;
