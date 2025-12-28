INSERT INTO ct (
    id,
    geom,
    fld_i,
    fld_t,
    fld_d
)
VALUES
    (:p_fid, ST_GeomFromWKB(:geom, 3857), :fld_1, :fld_2, :fld_3)
RETURNING ct.id;
