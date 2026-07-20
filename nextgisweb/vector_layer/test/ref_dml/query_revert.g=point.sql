SELECT
    sub.fid,
    sub.current,
    sub.previous,
    sub.geom,
    sub.fld_1,
    sub.fld_2,
    sub.fld_3
FROM (
    SELECT
        et.fid AS fid,
        et.vop <> 'D' AS current,
        COALESCE(ht.vop <> 'D', FALSE) AS previous,
        ht.geom AS geom,
        ht.fld_i AS fld_1,
        ht.fld_t AS fld_2,
        ht.fld_d AS fld_3
    FROM et AS et
    LEFT OUTER JOIN ht AS ht
        ON ht.fid = et.fid AND int4range(ht.vid, ht.nid) @> :vid
    WHERE
        et.vid > :vid
) AS sub
WHERE
    current <> previous OR (
        current AND previous
    );
