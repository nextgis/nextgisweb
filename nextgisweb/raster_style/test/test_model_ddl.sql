/*** Table: raster_style ***/

CREATE TABLE raster_style (
    id integer NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (id) REFERENCES resource (id)
);

COMMENT ON TABLE raster_style IS 'raster_style';
