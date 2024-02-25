WITH uct AS (
    UPDATE ct SET geom = :geom, fld_i = :fld_1, fld_t = :fld_2, fld_d = :fld_3
    WHERE
        ct.id = :id
        AND (
            CAST(:geom AS GEOMETRY(POINTZ, 3857)) IS DISTINCT FROM geom
            OR CAST(:fld_1 AS INT) IS DISTINCT FROM fld_i
            OR CAST(:fld_2 AS TEXT) IS DISTINCT FROM fld_t OR CAST(:fld_3 AS DATE) IS DISTINCT FROM fld_d
        )
    RETURNING ct.id
), iht AS (
    INSERT INTO ht (
        fid,
        vid,
        nid,
        vop,
        nop,
        geom,
        fld_i,
        fld_t,
        fld_d
    )
    SELECT
        uct.id AS fid,
        et.vid AS vid,
        :vid AS nid,
        et.vop AS vop,
        'U' AS nop,
        ct.geom AS geom,
        ct.fld_i AS fld_i,
        ct.fld_t AS fld_t,
        ct.fld_d AS fld_d
    FROM uct
    JOIN et
        ON et.fid = uct.id
    JOIN ct
        ON ct.id = et.fid
    RETURNING ht.fid
)
UPDATE et SET vid = :vid, vop = 'U'
FROM iht
WHERE
    iht.fid = et.fid
RETURNING et.fid AS id;
