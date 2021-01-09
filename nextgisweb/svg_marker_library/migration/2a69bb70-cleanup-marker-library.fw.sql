/*** {
    "revision": "2a69bb70", "parents": ["00000000"],
    "date": "2020-10-19T00:00:00",
    "message": "Cleanup marker library"
} ***/

DROP TABLE IF EXISTS marker;
DROP TABLE IF EXISTS marker_category;
DROP TABLE IF EXISTS marker_collection;

DELETE FROM fileobj WHERE component = 'marker_library';