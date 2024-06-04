DELETE FROM ct
WHERE
    ct.id = :id
RETURNING ct.id;
