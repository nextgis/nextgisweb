/*** {
    "revision": "4da181ed", "parents": ["4c303b5e"],
    "date": "2025-08-12T16:37:12",
    "message": "Add meta and geo_transform columns"
} ***/

ALTER TABLE raster_layer
  ADD COLUMN meta jsonb,
  ADD COLUMN geo_transform float8[];
