CREATE SEQUENCE id_seqt START WITH 1 MINVALUE -2147483648;

CREATE TABLE ct (
    id integer NOT NULL,
    geom geometry(POINTZ, 3857),
    fld_i integer,
    fld_t text,
    fld_d date,
    PRIMARY KEY (id)
);

CREATE INDEX idx_ct_geom ON ct USING gist(geom);
