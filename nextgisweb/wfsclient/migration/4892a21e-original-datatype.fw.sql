/*** {
    "revision": "4892a21e", "parents": ["37e6416e"],
    "date": "2024-12-03T02:29:03",
    "message": "Original datatype"
} ***/

ALTER TABLE layer_field_wfsclient_layer ADD COLUMN orig_datatype character varying(50);

UPDATE layer_field_wfsclient_layer l
SET orig_datatype =
	CASE lf.datatype
		WHEN 'INTEGER' THEN 'XSD_INTEGER'
		WHEN 'BIGINT' THEN 'XSD_LONG'
		WHEN 'REAL' THEN 'XSD_DOUBLE'
		WHEN 'STRING' THEN 'XSD_STRING'
		WHEN 'DATE' THEN 'XSD_DATE'
		WHEN 'TIME' THEN 'XSD_TIME'
		WHEN 'DATETIME' THEN 'XSD_DATETIME'
	END
FROM layer_field lf
WHERE lf.id = l.id;

ALTER TABLE layer_field_wfsclient_layer ALTER COLUMN orig_datatype SET NOT NULL;
