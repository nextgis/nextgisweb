ALTER TABLE public.resource ADD COLUMN creation_date timestamp without time zone;
UPDATE public.resource SET creation_date = '1970-01-01';
ALTER TABLE public.resource ALTER COLUMN creation_date SET NOT NULL;