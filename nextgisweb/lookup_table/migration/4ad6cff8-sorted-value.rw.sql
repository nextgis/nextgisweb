/*** { "revision": "4ad6cff8" } ***/

ALTER TABLE lookup_table ADD COLUMN val hstore;

WITH t1 AS (
	SELECT id, jsonb_array_elements(value) obj
	FROM lookup_table
), t2 AS (
	SELECT id, hstore(array_agg(obj->>0), array_agg(obj->>1)) AS val
	FROM t1
	GROUP BY id
)
UPDATE lookup_table lt SET val = t2.val
FROM t2
WHERE lt.id = t2.id;

ALTER TABLE lookup_table DROP COLUMN value;
ALTER TABLE lookup_table DROP COLUMN sort;
