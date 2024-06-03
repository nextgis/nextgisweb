INSERT INTO et (
    fid,
    vid,
    vop
)
SELECT
    ct.id,
    :vid AS vid,
    'С'
FROM ct;
