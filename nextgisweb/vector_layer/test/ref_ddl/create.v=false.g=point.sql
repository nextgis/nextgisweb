CREATE SEQUENCE id_seqt START WITH 1 MINVALUE -2147483648;

CREATE TABLE ct (
    id INT NOT NULL,
    geom GEOMETRY(POINTZ, 3857),
    fld_i INT,
    fld_t TEXT,
    fld_d DATE,
    PRIMARY KEY (id)
);

CREATE INDEX idx_ct_geom ON ct USING gist(geom);
