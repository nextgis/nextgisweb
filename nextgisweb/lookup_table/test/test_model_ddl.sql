/*** Table: lookup_table ***/

CREATE TABLE lookup_table (
    id integer NOT NULL,
    value jsonb NOT NULL,
    sort character varying(50) NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (id) REFERENCES resource (id)
);

COMMENT ON TABLE lookup_table IS 'lookup_table';
