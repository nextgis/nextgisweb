/*** { "revision": "54e20d45" } ***/

CREATE TABLE IF NOT EXISTS core_cstate (
    component character varying NOT NULL,
    heads character varying NOT NULL,
    PRIMARY KEY (component)
);

COMMENT ON TABLE core_cstate IS 'core';
