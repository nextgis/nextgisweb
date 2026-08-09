/*** Table: basemap_layer ***/

CREATE TABLE basemap_layer (
    id integer NOT NULL,
    url character varying NOT NULL,
    qms character varying,
    copyright_text character varying,
    copyright_url character varying,
    z_min integer,
    z_max integer,
    PRIMARY KEY (id),
    FOREIGN KEY (id) REFERENCES resource (id)
);

COMMENT ON TABLE basemap_layer IS 'basemap';

/*** Table: basemap_webmap ***/

CREATE TABLE basemap_webmap (
    webmap_id integer NOT NULL,
    resource_id integer NOT NULL,
    position integer,
    display_name character varying NOT NULL,
    enabled boolean,
    opacity double precision,
    PRIMARY KEY (webmap_id, resource_id),
    FOREIGN KEY (webmap_id) REFERENCES webmap (id),
    FOREIGN KEY (resource_id) REFERENCES resource (id)
);

COMMENT ON TABLE basemap_webmap IS 'basemap';

/*** Table: basemap_webmap_config ***/

CREATE TABLE basemap_webmap_config (
    webmap_id integer NOT NULL,
    background_color character varying(6),
    disable boolean NOT NULL,
    PRIMARY KEY (webmap_id),
    FOREIGN KEY (webmap_id) REFERENCES webmap (id)
);

COMMENT ON TABLE basemap_webmap_config IS 'basemap';
