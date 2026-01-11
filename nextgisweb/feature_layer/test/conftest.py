from __future__ import annotations

import json
from contextlib import contextmanager
from unittest.mock import PropertyMock, patch

import pytest
import transaction

from nextgisweb.env import DBSession

from nextgisweb.vector_layer import VectorLayer

from ..component import FeatureLayerComponent

FILTER_GEOJSON = {
    "type": "FeatureCollection",
    "crs": {"type": "name", "properties": {"name": "urn:ogc:def:crs:EPSG::3857"}},
    "features": [
        {
            "type": "Feature",
            "properties": {
                "name": "Alice",
                "age": 25,
                "score": 8.5,
                "city": "NYC",
                "birth_date": "1998-05-15",
                "created_at": "2023-01-10T08:30:00",
                "work_start": "09:00:00",
            },
            "geometry": {"type": "Point", "coordinates": [0, 0]},
        },
        {
            "type": "Feature",
            "properties": {
                "name": "Bob",
                "age": 30,
                "score": 7.0,
                "city": "LA",
                "birth_date": "1993-08-22",
                "created_at": "2023-02-15T14:45:30",
                "work_start": "10:30:00",
            },
            "geometry": {"type": "Point", "coordinates": [1, 1]},
        },
        {
            "type": "Feature",
            "properties": {
                "name": "Charlie",
                "age": 35,
                "score": 9.0,
                "city": "NYC",
                "birth_date": "1988-12-01",
                "created_at": "2023-03-20T16:20:15",
                "work_start": "08:00:00",
            },
            "geometry": {"type": "Point", "coordinates": [2, 2]},
        },
        {
            "type": "Feature",
            "properties": {
                "name": "Diana",
                "age": 28,
                "score": 6.5,
                "city": "SF",
                "birth_date": "1995-03-10",
                "created_at": "2023-01-25T11:15:00",
                "work_start": "09:30:00",
            },
            "geometry": {"type": "Point", "coordinates": [3, 3]},
        },
        {
            "type": "Feature",
            "properties": {
                "name": "Eve",
                "age": 32,
                "score": 8.0,
                "city": "NYC",
                "birth_date": "1991-07-18",
                "created_at": "2023-04-05T10:00:00",
                "work_start": "08:30:00",
            },
            "geometry": {"type": "Point", "coordinates": [4, 4]},
        },
    ],
}


@pytest.fixture(scope="module")
def feature_layer_filter_dataset():
    with transaction.manager:
        layer = VectorLayer().persist().from_ogr(json.dumps(FILTER_GEOJSON))
        DBSession.flush()
    yield layer.id


@pytest.fixture(scope="session", autouse=True)
def ngw_fversioning_default():
    current = False  # Disable by default in tests

    @contextmanager
    def override(value: bool):
        nonlocal current
        previous = current
        current = value
        try:
            yield
        finally:
            current = previous

    with patch.object(
        FeatureLayerComponent,
        "versioning_default",
        new_callable=PropertyMock,
    ) as mock_versioning_default:
        mock_versioning_default.side_effect = lambda: current
        yield override
