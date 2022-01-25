/*** {
    "revision": "33b2c229", "parents": ["3206493e"],
    "date": "2022-01-25T16:22:57",
    "message": "Add public to WebMapAnnotation"
} ***/

ALTER TABLE public.webmap_annotation
    ADD COLUMN "public"  BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN "user_id" INTEGER;

ALTER TABLE public.webmap_annotation
    ADD CONSTRAINT user_id_fk
        FOREIGN KEY (user_id)
            REFERENCES auth_user (principal_id)
            ON DELETE CASCADE;
