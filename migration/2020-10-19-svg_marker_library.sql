CREATE TABLE svg_marker_library
(
    id integer NOT NULL,
    stuuid character varying(32),
    tstamp timestamp without time zone,
    CONSTRAINT svg_marker_library_pkey PRIMARY KEY (id),
    CONSTRAINT svg_marker_library_id_fkey FOREIGN KEY (id)
        REFERENCES resource (id)
);

CREATE SEQUENCE svg_marker_id_seq;

CREATE TABLE svg_marker
(
    id integer NOT NULL DEFAULT nextval('svg_marker_id_seq'::regclass),
    svg_marker_library_id integer NOT NULL,
    fileobj_id integer NOT NULL,
    name character varying(255) NOT NULL,
    CONSTRAINT svg_marker_pkey PRIMARY KEY (id),
    CONSTRAINT svg_marker_svg_marker_library_id_name_key UNIQUE (svg_marker_library_id, name),
    CONSTRAINT svg_marker_fileobj_id_fkey FOREIGN KEY (fileobj_id)
        REFERENCES fileobj (id),
    CONSTRAINT svg_marker_svg_marker_library_id_fkey FOREIGN KEY (svg_marker_library_id)
        REFERENCES svg_marker_library (id)
);

COMMENT ON TABLE svg_marker_library IS 'svg_marker_library';
COMMENT ON TABLE svg_marker IS 'svg_marker_library';


DROP TABLE IF EXISTS marker;
DROP TABLE IF EXISTS marker_category;
DROP TABLE IF EXISTS marker_collection;

DELETE FROM fileobj WHERE component = 'marker_library';
