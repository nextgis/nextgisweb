SELECT
    sub.feature_id,
    sub.extension_id,
    sub.current,
    sub.previous,
    sub.version_id,
    sub.version_op,
    sub.column_a,
    sub.column_b
FROM (
    SELECT
        et.feature_id AS feature_id,
        et.extension_id AS extension_id,
        (
            NOT et.version_op IN ('D', 'O')
        ) AS current,
        COALESCE((
            NOT ht.version_op IN ('D', 'O')
        ), FALSE) AS previous,
        et.version_id AS version_id,
        et.version_op AS version_op,
        ht.column_a AS column_a,
        ht.column_b AS column_b
    FROM complex_et AS et
    LEFT OUTER JOIN complex_ht AS ht
        ON ht.resource_id = et.resource_id
        AND ht.feature_id = et.feature_id
        AND ht.extension_id = et.extension_id
        AND int4range(ht.version_id, ht.version_nid) @> :p_vid
    WHERE
        et.resource_id = :p_rid AND et.version_id > :p_vid
) AS sub
WHERE
    current <> previous OR (
        current AND previous
    );
