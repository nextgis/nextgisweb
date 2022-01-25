/*** { "revision": "33b2c229" } ***/

ALTER TABLE public.webmap_annotation DROP CONSTRAINT user_id_fk;

ALTER TABLE public.webmap_annotation
    DROP COLUMN "public",
    DROP COLUMN "user_id";
