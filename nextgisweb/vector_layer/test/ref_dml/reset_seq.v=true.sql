SELECT
    setval('id_seqt', COALESCE((
        SELECT
            MAX(et.fid) AS fid
        FROM et
    ), 0)) AS fid;
