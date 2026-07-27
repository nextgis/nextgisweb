/*** {
    "revision": "5497c119", "parents": ["4d12e52e"],
    "date": "2026-07-26T08:27:32",
    "message": "Add basemap_webmap_config table"
} ***/

CREATE TABLE basemap_webmap_config (
	webmap_id integer NOT NULL,
	background_color varchar(6) NULL,
	disable boolean NOT NULL DEFAULT false,
	CONSTRAINT basemap_webmap_config_pkey PRIMARY KEY (webmap_id),
	CONSTRAINT basemap_webmap_config_webmap_id_fkey FOREIGN KEY (webmap_id) REFERENCES webmap(id)
);
