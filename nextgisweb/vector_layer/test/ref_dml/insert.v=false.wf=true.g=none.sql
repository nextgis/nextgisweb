INSERT INTO ct (
    id,
    fld_i,
    fld_t,
    fld_d
)
VALUES
    (:p_fid, :fld_1, :fld_2, :fld_3)
RETURNING ct.id;
