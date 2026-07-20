WITH ict AS (
    INSERT INTO ct (
        id,
        geom,
        fld_i,
        fld_t,
        fld_d
    )
    VALUES
        (nextval('id_seqt'), ST_GeomFromWKB(:geom, 3857), :fld_1, :fld_2, :fld_3)
    RETURNING ct.id AS fid, :vid AS vid, 'С' AS vop
)
INSERT INTO et (
    fid,
    vid,
    vop
)
SELECT
    ict.fid,
    ict.vid,
    ict.vop
FROM ict
RETURNING et.fid AS id;
