ALTER TABLE public.resource ADD COLUMN preview_fileobj_id integer;
ALTER TABLE public.resource ADD CONSTRAINT resource_preview_fileobj_id_fkey
    FOREIGN KEY (preview_fileobj_id)
    REFERENCES public.fileobj (id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE NO ACTION;
