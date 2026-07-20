SELECT DISTINCT
    et.fid AS fid
FROM et AS et
WHERE
    et.vid > :p_initial
    AND et.vid <= :p_target
    AND (
        :p_fid_last IS NULL OR et.fid > :p_fid_last
    )
ORDER BY
    et.fid
LIMIT :p_fid_limit;

SELECT DISTINCT
    ht.fid AS fid
FROM ht AS ht
WHERE
    ht.vid > :p_initial
    AND ht.vid <= :p_target
    AND (
        :p_fid_last IS NULL OR ht.fid > :p_fid_last
    )
ORDER BY
    ht.fid
LIMIT :p_fid_limit;
