/*** {
    "revision": "2978ca7f", "parents": ["00000000"],
    "date": "2020-09-02T00:00:00",
    "message": "FileObj (uuid, component) unique"
} ***/

CREATE UNIQUE INDEX fileobj_uuid_component_idx ON fileobj
    USING btree (uuid, component);