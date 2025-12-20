SELECT
    complex.id,
    complex.resource_id,
    complex.feature_id,
    complex.column_a,
    complex.column_b
FROM complex
WHERE
    complex.resource_id = :p_rid
    AND complex.feature_id = :p_fid
    AND complex.id = :p_eid;
