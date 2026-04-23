/*** {
    "revision": "758e5738", "parents": ["42550420"],
    "date": "2026-03-22T00:00:00",
    "message": "Add BOOLEAN datatype"
} ***/

ALTER TABLE layer_field DROP CONSTRAINT IF EXISTS layer_field_datatype_check;

ALTER TABLE layer_field
    ADD CONSTRAINT layer_field_datatype_check CHECK (datatype IN (
        'INTEGER', 'BIGINT', 'REAL', 'STRING', 'DATE', 'TIME', 'DATETIME', 'BOOLEAN'
    ));
