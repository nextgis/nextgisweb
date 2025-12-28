INSERT INTO simple (
    resource_id,
    feature_id,
    value
)
SELECT
    :p_rid AS resource_id,
    simple.feature_id,
    simple.value
FROM simple
WHERE
    simple.resource_id = :p_sid;
