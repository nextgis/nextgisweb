/*** {
    "revision": "55db297c", "parents": ["55b358a5"],
    "date": "2026-09-29T10:09:12",
    "message": "Convert QMS to JSONB"
} ***/

ALTER TABLE basemap_layer
    ADD COLUMN type character varying(50),
    ADD COLUMN epsg integer;

CREATE FUNCTION pg_temp.try_jsonb_object(value text) RETURNS jsonb LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
    result jsonb;
BEGIN
    result := value::jsonb;
    IF jsonb_typeof(result) <> 'object' THEN
        RETURN NULL;
    END IF;
    RETURN result;
EXCEPTION
    WHEN others THEN RETURN NULL;
END $$;

UPDATE basemap_layer SET
    type = converted.type,
    epsg = converted.epsg,
    url = converted.url,
    qms = converted.qms
FROM (
    SELECT
        id,
        'tms'::text AS type,
        CASE
            WHEN data -> 'y_origin_top' = 'false'::jsonb
            THEN regexp_replace(url, '\{y\}', '{-y}', 'gi')
            ELSE url
        END AS url,
        CASE
            WHEN (data ->> 'epsg') ~ '^[0-9]{1,6}$' THEN (data ->> 'epsg')::integer
            ELSE 3857
        END AS epsg,
        CASE
            WHEN (data ->> 'id') ~ '^[0-9]{1,6}$' AND jsonb_typeof(data -> 'name') = 'string'
            THEN jsonb_build_object(
                'id', (data ->> 'id')::bigint,
                'name', data ->> 'name'
            )
            ELSE NULL
        END AS qms
    FROM (
        SELECT id, url, pg_temp.try_jsonb_object(qms) AS data
        FROM basemap_layer WHERE qms IS NOT NULL
    ) AS parsed
) AS converted
WHERE basemap_layer.id = converted.id; 

DROP FUNCTION pg_temp.try_jsonb_object(text);

UPDATE basemap_layer SET
    type = COALESCE(type, 'tms'),
    epsg = COALESCE(epsg, 3857)
WHERE epsg IS NULL OR type IS NULL;

ALTER TABLE basemap_layer
    ALTER COLUMN type SET NOT NULL,
    ALTER COLUMN epsg SET NOT NULL,
    ALTER COLUMN qms TYPE jsonb USING qms::jsonb;
