CREATE TABLE et (
    fid integer NOT NULL,
    vid integer NOT NULL,
    vop character(1) NOT NULL,
    PRIMARY KEY (fid)
);

CREATE INDEX et_vid_fid_idx ON et(vid, fid);

CREATE TABLE ht (
    vid integer NOT NULL,
    fid integer NOT NULL,
    nid integer NOT NULL CHECK (nid > vid),
    vop character(1) NOT NULL,
    nop character(1) NOT NULL,
    fld_i integer,
    fld_t text,
    fld_d date,
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
    ADD CONSTRAINT ct_id_fk FOREIGN KEY (id) REFERENCES et (fid) DEFERRABLE INITIALLY DEFERRED;
