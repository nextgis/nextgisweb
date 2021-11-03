/*** { "revision": "3206493e" } ***/

DELETE
FROM setting
WHERE component = 'webmap'
  AND (
            name = 'address_search_enabled' OR
            name = 'address_search_extent' OR
            name = 'address_geocoder' OR
            name = 'yandex_api_geocoder_key'
    );
