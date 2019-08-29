ALTER TABLE public.raster_layer ADD COLUMN dtype character varying;
UPDATE public.raster_layer SET dtype = 'Byte';
ALTER TABLE public.raster_layer ALTER COLUMN dtype SET NOT NULL;