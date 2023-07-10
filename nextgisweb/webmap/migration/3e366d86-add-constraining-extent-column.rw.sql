/*** { "revision": "3e366d86" } ***/

ALTER TABLE webmap ADD COLUMN extent_constrained boolean;

UPDATE webmap
SET extent_constrained = (
    extent_const_left IS NOT NULL OR
    extent_const_right IS NOT NULL OR
    extent_const_bottom IS NOT NULL OR
    extent_const_top IS NOT NULL
);


ALTER TABLE webmap DROP COLUMN extent_const_left;
ALTER TABLE webmap DROP COLUMN extent_const_right;
ALTER TABLE webmap DROP COLUMN extent_const_bottom;
ALTER TABLE webmap DROP COLUMN extent_const_top;