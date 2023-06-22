/*** {
    "revision": "3df5a71f", "parents": ["37e64383"],
    "date": "2023-06-22T02:33:29",
    "message": "JSONB vendor params"
} ***/

ALTER TABLE wmsclient_layer ADD COLUMN vendor_params jsonb;

UPDATE wmsclient_layer
SET vendor_params = sq.vendor_params
FROM (
	SELECT resource_id, jsonb_object_agg(key, value) as vendor_params
	FROM wmsclient_layer_vendor_param
	GROUP BY resource_id
) sq
WHERE id = sq.resource_id;
UPDATE wmsclient_layer SET vendor_params = '{}'::jsonb WHERE vendor_params IS NULL;

ALTER TABLE wmsclient_layer ALTER COLUMN vendor_params SET NOT NULL;

DROP TABLE wmsclient_layer_vendor_param;
