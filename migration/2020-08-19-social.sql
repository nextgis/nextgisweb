CREATE TABLE public.resource_social
(
    resource_id integer NOT NULL,
    preview_fileobj_id integer,
    preview_description character varying,
    CONSTRAINT resource_social_pkey PRIMARY KEY (resource_id),
    CONSTRAINT resource_social_preview_fileobj_id_fkey FOREIGN KEY (preview_fileobj_id)
        REFERENCES public.fileobj (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,
    CONSTRAINT resource_social_resource_id_fkey FOREIGN KEY (resource_id)
        REFERENCES public.resource (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
);

ALTER TABLE public.resource_social OWNER to nextgisweb;

COMMENT ON TABLE public.resource_social IS 'social';
