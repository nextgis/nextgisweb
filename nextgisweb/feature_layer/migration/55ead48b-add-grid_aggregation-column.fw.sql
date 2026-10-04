/*** {
    "revision": "55ead48b", "parents": ["76a5b417"],
    "date": "2026-09-30T11:53:26",
    "message": "Add grid_aggregation column"
} ***/

ALTER TABLE layer_field ADD COLUMN grid_aggregation character varying(50);
