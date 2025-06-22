CREATE TABLE et (
    fid INT NOT NULL,
    vid INT NOT NULL,
    vop CHAR(1) NOT NULL,
    PRIMARY KEY (fid)
);

CREATE INDEX et_vid_fid_idx ON et(vid, fid);

CREATE TABLE ht (
    vid INT NOT NULL,
    fid INT NOT NULL,
    nid INT NOT NULL CHECK (nid > vid),
    vop CHAR(1) NOT NULL,
    nop CHAR(1) NOT NULL,
    geom GEOMETRY(POINTZ, 3857),
    fld_i INT,
    fld_t TEXT,
    fld_d DATE,
    PRIMARY KEY (vid, fid),
    CONSTRAINT ht_vid_nid_fid_idx EXCLUDE USING gist(int4range(vid, nid) WITH &&, int4range(fid, fid, '[]') WITH &&)
);

CREATE INDEX ht_fid_vid_idx ON ht(fid, vid);

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

ALTER TABLE ct 
    ADD     CONSTRAINT ct_id_fk FOREIGN KEY (id) REFERENCES et (
            fid
        ) DEFERRABLE INITIALLY DEFERRED;
