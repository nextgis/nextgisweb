/*** { "revision": "55ead48b" } ***/

ALTER TABLE layer_field DROP CONSTRAINT layer_field_grid_aggregation_check;
ALTER TABLE layer_field DROP COLUMN grid_aggregation;
