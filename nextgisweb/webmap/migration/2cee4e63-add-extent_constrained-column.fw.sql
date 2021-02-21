/*** {
    "revision": "2cee4e63", "parents": ["20802903"],
    "date": "2021-02-21T17:39:50",
    "message": "Add extent_constrained column"
} ***/

ALTER TABLE public.webmap ADD COLUMN extent_constrained boolean;
UPDATE public.webmap SET extent_constrained = False;
