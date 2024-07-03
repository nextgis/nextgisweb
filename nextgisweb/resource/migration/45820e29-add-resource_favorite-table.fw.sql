/*** {
    "revision": "45820e29", "parents": ["00000000"],
    "date": "2024-07-03T01:22:19",
    "message": "Add resource_favorite table"
} ***/

CREATE TABLE resource_favorite (
	id serial NOT NULL,
	resource_id integer NOT NULL,
	user_id integer NOT NULL,
	component text NOT NULL,
	kind text NOT NULL,
	created timestamp NOT NULL,
	label varchar NULL,
	data jsonb NOT NULL,
	CONSTRAINT resource_favorite_pkey PRIMARY KEY (id),
    CONSTRAINT resource_favorite_resource_id_fkey FOREIGN KEY (resource_id) REFERENCES resource(id) ON DELETE CASCADE,
    CONSTRAINT resource_favorite_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth_principal(id) ON DELETE CASCADE
);
