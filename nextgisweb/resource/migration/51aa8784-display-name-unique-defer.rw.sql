/*** { "revision": "51aa8784" } ***/

ALTER TABLE resource DROP CONSTRAINT resource_parent_id_display_name_key;
ALTER TABLE resource ADD CONSTRAINT resource_parent_id_display_name_key
    UNIQUE (parent_id, display_name);
