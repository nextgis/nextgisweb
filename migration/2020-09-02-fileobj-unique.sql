CREATE UNIQUE INDEX fileobj_uuid_component_idx ON fileobj
USING btree (uuid, component);
