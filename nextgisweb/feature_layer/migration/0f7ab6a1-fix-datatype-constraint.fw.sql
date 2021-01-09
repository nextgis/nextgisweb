/*** {
    "revision": "0f7ab6a1", "parents": ["00000000"],
    "date": "2017-02-12T00:00:00",
    "message": "Fix datatype constraint"
} ***/

ALTER TABLE layer_field DROP CONSTRAINT IF EXISTS layer_field_datatype_check;
ALTER TABLE layer_field DROP CONSTRAINT IF EXISTS layer_field_datatype_check1;

ALTER TABLE layer_field
    ADD CONSTRAINT layer_field_datatype_check CHECK (datatype IN (
        'INTEGER', 'BIGINT', 'REAL', 'STRING', 'DATE', 'TIME', 'DATETIME'
    ));