/*** { "revision": "55db297c" } ***/

ALTER TABLE basemap_layer
    ALTER COLUMN qms TYPE character varying USING (
        qms || jsonb_build_object(
            'url', replace(url, '{-y}', '{y}'),
            'type', COALESCE(type, 'tms'),
            'epsg', epsg,
            'y_origin_top', position('{-y}' in url) = 0,
            'z_min', z_min,
            'z_max', z_max,
            'copyright_text', copyright_text,
            'copyright_url', copyright_url
        )
    )::text,
    DROP COLUMN type,
    DROP COLUMN epsg;
