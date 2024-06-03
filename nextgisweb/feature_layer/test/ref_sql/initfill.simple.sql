INSERT INTO simple_et (
    resource_id,
    feature_id,
    version_id,
    version_op
)
SELECT
    simple.resource_id,
    simple.feature_id,
    :p_vid AS anon_1,
    :p_vop AS anon_2
FROM simple
WHERE
    simple.resource_id = :p_rid;
