/*** {
    "revision": "2e803d47", "parents": ["2d9056c4"],
    "date": "2021-05-11T03:22:14",
    "message": "Add storage tables"
} ***/

CREATE TABLE public.core_storage_stat_delta
(
    "timestamp" timestamp without time zone NOT NULL,
    component character varying,
    kind_of_data character varying,
    resource_id integer,
    value_data_volume integer
);

CREATE TABLE public.core_storage_stat_delta_total
(
    "timestamp" timestamp without time zone NOT NULL,
    kind_of_data character varying,
    value_data_volume integer
);

CREATE TABLE public.core_storage_stat_dimension
(
    "timestamp" timestamp without time zone NOT NULL,
    component character varying,
    kind_of_data character varying,
    resource_id integer,
    value_data_volume integer
);

CREATE TABLE public.core_storage_stat_dimension_total
(
    "timestamp" timestamp without time zone NOT NULL,
    kind_of_data character varying,
    value_data_volume integer
);
