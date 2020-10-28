CREATE TABLE IF NOT EXISTS lookup_table
(
    id integer NOT NULL,
    val hstore,
    CONSTRAINT lookup_table_pkey PRIMARY KEY (id),
    CONSTRAINT lookup_table_id_fkey FOREIGN KEY (id)
        REFERENCES resource (id)
);

COMMENT ON TABLE lookup_table IS 'lookup_table';
