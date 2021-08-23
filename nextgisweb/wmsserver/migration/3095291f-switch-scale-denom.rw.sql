/*** { "revision": "3095291f" } ***/

UPDATE wmsserver_layer
SET min_scale_denom = max_scale_denom,
    max_scale_denom = min_scale_denom;
