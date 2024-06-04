WITH dct AS (
    DELETE FROM ct
    WHERE
        ct.id = :id
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
        dct.id AS fid,
        et.vid AS vid,
        :vid AS nid,
        et.vop AS vop,
        'D' AS nop,
        ct.geom AS geom,
        ct.fld_i AS fld_i,
        ct.fld_t AS fld_t,
        ct.fld_d AS fld_d
    FROM dct
    JOIN et
        ON et.fid = dct.id
    JOIN ct
        ON ct.id = et.fid
    RETURNING ht.fid
)
UPDATE et SET vid = :vid, vop = 'D'
FROM iht
WHERE
    iht.fid = et.fid
RETURNING iht.fid AS id;
