WITH qet AS (
    SELECT
        et.fid AS fid,
        et.vid AS vid
    FROM et
    WHERE
        et.fid = :p_fid AND et.vop = 'D'
), sht AS (
    SELECT
        ht.fid AS fid,
        ht.nid AS nid,
        ht.nop AS nop,
        ST_GeomFromWKB(:geom, 3857) AS geom,
        :fld_1 AS fld_i,
        :fld_2 AS fld_t,
        :fld_3 AS fld_d
    FROM ht, qet
    WHERE
        ht.fid = qet.fid
        AND (
            int4range(ht.vid, ht.nid) && int4range(qet.vid - 1, qet.vid)
        )
), ict AS (
    INSERT INTO ct (
        id,
        geom,
        fld_i,
        fld_t,
        fld_d
    )
    SELECT
        sht.fid AS fid,
        sht.geom AS geom,
        fld_i,
        fld_t,
        fld_d
    FROM sht
    RETURNING ct.id
), iht AS (
    INSERT INTO ht (
        fid,
        vid,
        nid,
        vop,
        nop
    )
    SELECT
        sht.fid AS fid,
        sht.nid AS nid,
        :p_vid AS anon_1,
        sht.nop AS nop,
        'R'
    FROM sht
    RETURNING ht.fid
)
UPDATE et SET vid = :p_vid, vop = 'R'
FROM ict, iht
WHERE
    et.fid = ict.id AND iht.fid = ict.id
RETURNING et.fid AS id;
