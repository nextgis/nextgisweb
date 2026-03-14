/*** {
    "revision": "581f174c", "parents": ["0ab32bbc"],
    "date": "2026-03-11T00:00:00",
    "message": "Add remote SRS to WMS layer"
} ***/

ALTER TABLE wmsclient_layer ADD COLUMN remote_srs_id integer REFERENCES srs(id);
UPDATE wmsclient_layer SET remote_srs_id = 3857;
ALTER TABLE wmsclient_layer ALTER COLUMN remote_srs_id SET NOT NULL;
