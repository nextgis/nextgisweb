/*** {
    "revision": "46005e79", "parents": ["37e63f22"],
    "date": "2024-07-27T16:43:39",
    "message": "Fix sequence ownership"
} ***/

DO $$
DECLARE
    row record;
BEGIN
    FOR row IN (
        SELECT quote_ident(n.nspname) || '.' || quote_ident(c.relname) AS ident 
        FROM pg_catalog.pg_class c
            INNER JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
            INNER JOIN pg_catalog.pg_depend d ON c.oid = d.objid AND d.deptype = 'a'
        WHERE c.relkind = 'S'
            AND n.nspname = 'vector_layer'
            AND c.relname LIKE 'layer_%_id_seq'
    ) LOOP
        RAISE NOTICE 'Resetting owner of %', row.ident; 
        EXECUTE 'ALTER SEQUENCE ' || row.ident || ' OWNED BY NONE';
    END LOOP;
END $$;

