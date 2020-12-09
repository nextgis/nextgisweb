ALTER TABLE public.tmsclient_connection
    ADD COLUMN skip_verify boolean NOT NULL DEFAULT false;
