SELECT
    setval('id_seqt', COALESCE((
        SELECT
            MAX(ct.id) AS fid
        FROM ct
    ), 0)) AS fid;
