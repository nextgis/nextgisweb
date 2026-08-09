CREATE SEQUENCE id_seqt START WITH 1 MINVALUE -2147483648;

CREATE TABLE ct (
    id integer NOT NULL,
    fld_i integer,
    fld_t text,
    fld_d date,
    PRIMARY KEY (id)
);
