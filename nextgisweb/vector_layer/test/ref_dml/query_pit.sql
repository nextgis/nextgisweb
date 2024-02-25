SELECT
    ht.fid,
    ht.vid,
    ht.geom,
    ht.fld_i AS fld_1,
    ht.fld_t AS fld_2,
    ht.fld_d AS fld_3
FROM ht AS ht
WHERE
    ht.vop <> 'D' AND int4range(vid, nid) @> :vid
UNION ALL
SELECT
    et.fid,
    et.vid,
    ct.geom,
    ct.fld_i AS fld_1,
    ct.fld_t AS fld_2,
    ct.fld_d AS fld_3
FROM et AS et
JOIN ct AS ct
    ON ct.id = et.fid
WHERE
    et.vid <= :vid;
