INSERT INTO complex_et (
    resource_id,
    feature_id,
    extension_id,
    version_id,
    version_op
)
VALUES
    (:p_rid, :p_fid, :p_eid, :p_vid, :p_vop);
