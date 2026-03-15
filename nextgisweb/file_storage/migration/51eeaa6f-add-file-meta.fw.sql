/*** {
    "revision": "51eeaa6f", "parents": ["42a4e9bb"],
    "date": "2026-03-15T11:50:50",
    "message": "Add file meta"
} ***/

CREATE TABLE filemeta
(
    fileobj_id integer PRIMARY KEY,
    value jsonb NOT NULL,
    CONSTRAINT filemeta_fileobj_id_fkey FOREIGN KEY (fileobj_id)
        REFERENCES fileobj (id)
        ON DELETE CASCADE
);

COMMENT ON TABLE filemeta IS 'file_storage';
