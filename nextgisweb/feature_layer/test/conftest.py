from __future__ import annotations

import json
from contextlib import contextmanager
from unittest.mock import PropertyMock, patch

import pytest
import transaction

from nextgisweb.env import DBSession

from nextgisweb.vector_layer import VectorLayer

from ..component import FeatureLayerComponent
from .filter_cases import FILTER_GEOJSON, APIRunner, GeoJSONRunner


@pytest.fixture
def api_runner(ngw_webtest_app, test_layer_id):
    return APIRunner(ngw_webtest_app, test_layer_id)


@pytest.fixture
def export_runner(ngw_webtest_app, test_layer_id):
    return GeoJSONRunner(ngw_webtest_app, test_layer_id)


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
