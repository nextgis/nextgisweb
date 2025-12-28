INSERT INTO complex (
    resource_id,
    feature_id,
    column_a,
    column_b
)
SELECT
    :p_rid AS resource_id,
    complex.feature_id,
    complex.column_a,
    complex.column_b
FROM complex
WHERE
    complex.resource_id = :p_sid;
