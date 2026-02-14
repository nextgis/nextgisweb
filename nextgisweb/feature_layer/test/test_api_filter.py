import json

import pytest

from nextgisweb.pyramid.test import WebTestApp

from .filter_cases import get_integration_cases, get_invalid_filter_cases

pytestmark = pytest.mark.usefixtures("ngw_resource_defaults", "ngw_auth_administrator")


@pytest.fixture(scope="module")
def test_layer_id(feature_layer_filter_dataset):
    return feature_layer_filter_dataset


@pytest.mark.parametrize("expression, expected_names", get_integration_cases())
def test_filter_api_logic(api_runner, expression, expected_names):
    assert api_runner.fetch_names(expression) == expected_names


@pytest.mark.parametrize("expression, expected_names", get_integration_cases(only_auto_all=True))
def test_filter_api_auto_all(api_runner, expression, expected_names):
    assert api_runner.fetch_names(["all", expression]) == expected_names


@pytest.fixture(params=[lambda expr: expr, lambda expr: ["all", expr]], ids=["raw", "all_wrapped"])
def auto_all(request):
    return request.param


@pytest.mark.parametrize("case", get_invalid_filter_cases())
def test_filter_validation_errors(api_runner, auto_all, case):
    expr = auto_all(case.expression) if case.auto_all else case.expression
    resp = api_runner.fetch_response(expr, status=case.api_status)

    if hasattr(case, "error_pattern") and case.error_pattern:
        error_message = resp.json.get("message", str(resp.json))
        assert case.error_pattern.lower() in error_message.lower(), (
            f"Expected error pattern '{case.error_pattern}' not found in '{error_message}'"
        )


def test_filter_empty_expression(ngw_webtest_app: WebTestApp, test_layer_id):
    filter = json.dumps([])

    resp = ngw_webtest_app.get(
        f"/api/resource/{test_layer_id}/feature/",
        query=dict(filter=filter),
        status=200,
    )

    assert len(resp.json) == 5


def test_filter_with_pagination(api_runner):
    filter_expr = ["all", ["==", ["get", "city"], "NYC"]]

    resp = api_runner.fetch_response(filter_expr, limit=2, offset=0)
    assert len(resp.json) == 2

    resp = api_runner.fetch_response(filter_expr, limit=2, offset=2)
    assert len(resp.json) == 1


def test_filter_with_ordering(api_runner):
    filter_expr = ["all", ["==", ["get", "city"], "NYC"]]

    resp = api_runner.fetch_response(filter_expr, order_by="-age")

    assert len(resp.json) == 3
    ages = [f["fields"]["age"] for f in resp.json]
    assert ages == [35, 32, 25]


def test_filter_multiple_nested_groups_impossible_condition(api_runner):
    filter_expr = [
        "all",
        [
            "all",
            ["==", ["get", "city"], "NYC"],
            ["==", ["get", "age"], 25],
        ],
        [
            "all",
            ["==", ["get", "city"], "NYC"],
            ["==", ["get", "age"], 35],
        ],
    ]

    resp = api_runner.fetch_response(filter_expr)
    assert len(resp.json) == 0


def test_filter_datetime_range(api_runner):
    filter_expr = [
        "all",
        [">=", ["get", "created_at"], "2023-01-01T00:00:00"],
        ["<", ["get", "created_at"], "2023-02-01T00:00:00"],
    ]

    resp = api_runner.fetch_response(filter_expr)
    assert len(resp.json) == 2
    names = {f["fields"]["name"] for f in resp.json}
    assert names == {"Alice", "Diana"}
