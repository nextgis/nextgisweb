/*** {
    "revision": "37e53073", "parents": ["2cbdc86f"],
    "date": "2022-08-23T06:28:54",
    "message": "Fix enum"
} ***/

ALTER TABLE layer_field DROP CONSTRAINT IF EXISTS layer_field_datatype_check;
ALTER TABLE layer_field ALTER COLUMN datatype TYPE character varying(50);
