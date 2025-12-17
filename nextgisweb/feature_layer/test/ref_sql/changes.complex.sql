SELECT
    CASE
        WHEN NOT pi AND pt AND NOT di
        THEN 'C'
        WHEN pi AND pt AND up
        THEN 'U'
        WHEN pi AND NOT pt
        THEN 'D'
        WHEN NOT pi AND pt AND di
        THEN 'R'
    END AS action,
    COALESCE(qi.fid, qt.fid) AS fid,
    COALESCE(qi.eid, qt.eid) AS eid,
    qt.vid AS vid,
    CONCAT(
        CASE WHEN sc_column_a THEN '1' ELSE '0' END,
        CASE WHEN sc_column_b THEN '1' ELSE '0' END
    ) AS sc,
    CASE WHEN sc_column_a THEN qt.column_a END AS column_a,
    CASE WHEN sc_column_b THEN qt.column_b END AS column_b
FROM (
    SELECT
        ht.feature_id AS fid,
        ht.extension_id AS eid,
        ht.version_id AS vid,
        ht.version_op = 'D' AS deleted,
        ht.column_a AS column_a,
        ht.column_b AS column_b
    FROM complex_ht AS ht
    WHERE
        int4range(ht.resource_id, ht.resource_id, '[]') @> :p_rid
        AND int4range(version_id, version_nid) @> :p_initial
        AND ht.feature_id >= :p_fid_min
        AND ht.feature_id <= :p_fid_max
) AS qi
FULL OUTER JOIN (
    SELECT
        et.feature_id AS fid,
        et.extension_id AS eid,
        et.version_id AS vid,
        ct.feature_id IS NULL AS deleted,
        ct.column_a AS column_a,
        ct.column_b AS column_b
    FROM complex_et AS et
    LEFT OUTER JOIN complex AS ct
        ON ct.resource_id = :p_rid
        AND ct.feature_id = et.feature_id
        AND ct.id = et.extension_id
    WHERE
        et.resource_id = :p_rid
        AND et.version_id > :p_initial
        AND et.version_id <= :p_target
        AND et.feature_id >= :p_fid_min
        AND et.feature_id <= :p_fid_max
    UNION ALL
    SELECT
        ht.feature_id AS fid,
        ht.extension_id AS eid,
        ht.version_id AS vid,
        ht.version_op = 'D' AS deleted,
        ht.column_a AS column_a,
        ht.column_b AS column_b
    FROM complex_ht AS ht
    WHERE
        int4range(ht.resource_id, ht.resource_id, '[]') @> :p_rid
        AND int4range(version_id, version_nid) @> :p_target
        AND ht.feature_id >= :p_fid_min
        AND ht.feature_id <= :p_fid_max
) AS qt
    ON qi.fid = qt.fid AND qi.eid = qt.eid
JOIN LATERAL (
    SELECT
        NOT qi.fid IS NULL AND NOT qi.deleted AS pi,
        NOT qi.fid IS NULL AND qi.deleted AS di,
        NOT qt.fid IS NULL AND NOT qt.deleted AS pt
) AS lat_pr
    ON TRUE
JOIN LATERAL (
    SELECT
        pt AND (
            NOT pi OR qt.column_a IS DISTINCT FROM qi.column_a
        ) AS sc_column_a,
        pt AND (
            NOT pi OR qt.column_b IS DISTINCT FROM qi.column_b
        ) AS sc_column_b
) AS lat_sc
    ON TRUE
JOIN LATERAL (
    SELECT
        sc_column_a OR sc_column_b AS up
) AS lat_up
    ON TRUE
WHERE
    pi <> pt OR up
ORDER BY
    COALESCE(qi.fid, qt.fid) ASC,
    COALESCE(qi.eid, qt.eid) ASC;
