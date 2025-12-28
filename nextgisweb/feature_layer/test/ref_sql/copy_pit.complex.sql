INSERT INTO complex (
    resource_id,
    feature_id,
    column_a,
    column_b
)
SELECT
    :p_rid AS resource_id,
    pit.feature_id,
    pit.column_a,
    pit.column_b
FROM (
    SELECT
        ht.feature_id AS feature_id,
        ht.extension_id AS extension_id,
        ht.version_id AS version_id,
        ht.column_a AS column_a,
        ht.column_b AS column_b
    FROM complex_ht AS ht
    WHERE
        int4range(ht.resource_id, ht.resource_id, '[]') @> :p_sid
        AND int4range(ht.version_id, ht.version_nid) @> :p_vid
    UNION ALL
    SELECT
        et.feature_id AS feature_id,
        et.extension_id AS extension_id,
        et.version_id AS version_id,
        ct.column_a AS column_a,
        ct.column_b AS column_b
    FROM complex_et AS et
    LEFT OUTER JOIN complex AS ct
        ON ct.resource_id = et.resource_id
        AND ct.feature_id = et.feature_id
        AND ct.id = et.extension_id
    WHERE
        et.resource_id = :p_sid AND et.version_id <= :p_vid
) AS pit;
