SELECT
    sub.feature_id,
    sub.extension_id,
    sub.current,
    sub.previous,
    sub.version_id,
    sub.version_op,
    sub.value
FROM (
    SELECT
        et.feature_id AS feature_id,
        NULL AS extension_id,
        (
            NOT et.version_op IN ('D', 'O')
        ) AS current,
        COALESCE((
            NOT ht.version_op IN ('D', 'O')
        ), FALSE) AS previous,
        et.version_id AS version_id,
        et.version_op AS version_op,
        ht.value AS value
    FROM simple_et AS et
    LEFT OUTER JOIN simple_ht AS ht
        ON ht.resource_id = et.resource_id
        AND ht.feature_id = et.feature_id
        AND int4range(ht.version_id, ht.version_nid) @> :p_vid
    WHERE
        et.resource_id = :p_rid AND et.version_id > :p_vid
) AS sub
WHERE
    current <> previous OR (
        current AND previous
    );
