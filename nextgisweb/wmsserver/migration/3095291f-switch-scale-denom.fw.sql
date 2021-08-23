/*** {
    "revision": "3095291f", "parents": ["2807b08b"],
    "date": "2021-08-23T02:18:59",
    "message": "Switch scale denom"
} ***/

UPDATE wmsserver_layer
SET min_scale_denom = max_scale_denom,
    max_scale_denom = min_scale_denom;
