WITH d as (
	SELECT service_id, keyname
	FROM (
		SELECT service_id,
               keyname,
               count(keyname) OVER (PARTITION BY (service_id, keyname)) AS duplicates
		FROM wfsserver_layer
	) as t
	WHERE duplicates != 1
	GROUP BY service_id, keyname
)
DELETE FROM wfsserver_layer as w
USING d
WHERE w.service_id = d.service_id AND w.keyname = d.keyname;

ALTER TABLE public.wfsserver_layer
    ADD CONSTRAINT wfsserver_layer_service_id_keyname_key UNIQUE (service_id, keyname);
