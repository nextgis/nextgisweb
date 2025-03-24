SELECT
    COALESCE(qi.fid, qt.fid) AS fid,
    qt.vid AS vid,
    CASE
        WHEN NOT pi AND pt AND NOT di
        THEN 'C'
        WHEN pi AND pt AND upd
        THEN 'U'
        WHEN pi AND NOT pt
        THEN 'D'
        WHEN NOT pi AND pt AND di
        THEN 'R'
    END AS op,
    CASE WHEN dif_geom THEN '1' ELSE '0' END || CASE WHEN dif_1 THEN '1' ELSE '0' END || CASE WHEN dif_2 THEN '1' ELSE '0' END || CASE WHEN dif_3 THEN '1' ELSE '0' END AS bits,
    CASE WHEN dif_geom THEN ST_AsBinary(qt.geom, 'NDR') END AS geom,
    CASE WHEN dif_1 THEN qt.fld_1 END AS fld_1,
    CASE WHEN dif_2 THEN qt.fld_2 END AS fld_2,
    CASE WHEN dif_3 THEN qt.fld_3 END AS fld_3
FROM (
    SELECT
        ht.fid AS fid,
        ht.vid AS vid,
        ht.vop = 'D' AS deleted,
        ht.geom AS geom,
        fld_i AS fld_1,
        fld_t AS fld_2,
        fld_d AS fld_3
    FROM ht AS ht
    WHERE
        int4range(vid, nid) @> :p_initial
        AND ht.fid >= :p_fid_min
        AND ht.fid <= :p_fid_max
) AS qi
FULL OUTER JOIN (
    SELECT
        et.fid AS fid,
        et.vid AS vid,
        ct.id IS NULL AS deleted,
        ct.geom AS geom,
        fld_i AS fld_1,
        fld_t AS fld_2,
        fld_d AS fld_3
    FROM et AS et
    LEFT OUTER JOIN ct AS ct
        ON ct.id = et.fid
    WHERE
        et.vid > :p_initial
        AND et.vid <= :p_target
        AND et.fid >= :p_fid_min
        AND et.fid <= :p_fid_max
    UNION ALL
    SELECT
        ht.fid AS fid,
        ht.vid AS vid,
        ht.vop = 'D' AS deleted,
        ht.geom AS geom,
        fld_i AS fld_1,
        fld_t AS fld_2,
        fld_d AS fld_3
    FROM ht AS ht
    WHERE
        int4range(vid, nid) @> :p_target AND ht.fid >= :p_fid_min AND ht.fid <= :p_fid_max
) AS qt
    ON qi.fid = qt.fid
JOIN LATERAL (
    SELECT
        NOT qi.fid IS NULL AND NOT qi.deleted AS pi,
        NOT qi.fid IS NULL AND qi.deleted AS di,
        NOT qt.fid IS NULL AND NOT qt.deleted AS pt
) AS lat_p
    ON TRUE
JOIN LATERAL (
    SELECT
        pt AND (
            NOT pi OR qt.geom IS DISTINCT FROM qi.geom
        ) AS dif_geom,
        pt AND (
            NOT pi OR qt.fld_1 IS DISTINCT FROM qi.fld_1
        ) AS dif_1,
        pt AND (
            NOT pi OR qt.fld_2 IS DISTINCT FROM qi.fld_2
        ) AS dif_2,
        pt AND (
            NOT pi OR qt.fld_3 IS DISTINCT FROM qi.fld_3
        ) AS dif_3
) AS lat_d
    ON TRUE
JOIN LATERAL (
    SELECT
        dif_geom OR dif_1 OR dif_2 OR dif_3 AS upd
) AS lat_u
    ON TRUE
WHERE
    pi <> pt OR upd;
