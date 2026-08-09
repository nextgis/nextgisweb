UPDATE ct SET fld_i = :fld_1, fld_t = :fld_2, fld_d = :fld_3
WHERE
    ct.id = :id
    AND (
        CAST(:fld_1 AS integer) IS DISTINCT FROM fld_i
        OR CAST(:fld_2 AS text) IS DISTINCT FROM fld_t
        OR CAST(:fld_3 AS date) IS DISTINCT FROM fld_d
    )
RETURNING ct.id;
