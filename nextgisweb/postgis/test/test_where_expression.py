import pytest

from nextgisweb.env import DBSession

from nextgisweb.core.exception import ValidationError
from nextgisweb.postgis import PostgisLayer
from nextgisweb.postgis.where import validate_where_expression

pytestmark = pytest.mark.usefixtures("ngw_resource_defaults", "ngw_auth_administrator")


@pytest.fixture
def layer(postgis_filter_layer_id):
    return PostgisLayer.filter_by(id=postgis_filter_layer_id).one()


def set_where(layer, expression):
    validated = validate_where_expression(
        expression,
        layer.allowed_where_functions(),
        layer.allowed_where_operators(),
    )
    layer.where_expression = validated.expression
    layer.where_functions = list(validated.functions) or None
    layer.where_operators = list(validated.operators) or None


def fetch_ids(layer):
    return [feature.id for feature in layer.feature_query()()]


def test_where_expression(layer):
    set_where(layer, "src.fld_age >= 30")
    assert fetch_ids(layer) == [2, 3, 5]


def test_where_with_filter_expression(layer):
    fquery = layer.feature_query()
    fquery.set_filter_program(layer.filter_parser.parse(["all", ["==", ["get", "city"], "NYC"]]))
    set_where(layer, "src.fld_age > 30")
    assert [feature.id for feature in fquery()] == [3, 5]


def test_where_total_count(layer):
    set_where(layer, "src.fld_city = 'NYC'")
    assert layer.feature_query()().total_count == 3


def test_where_extent(layer):
    full_extent = layer.extent

    set_where(layer, "src.fld_age >= 32")
    for extent in (layer.extent, layer.feature_query()().extent):
        assert extent["minLon"] > full_extent["minLon"]
        assert extent["minLat"] > full_extent["minLat"]
        assert extent["maxLon"] == pytest.approx(full_extent["maxLon"])
        assert extent["maxLat"] == pytest.approx(full_extent["maxLat"])


def test_where_feature_endpoint(layer, ngw_webtest_app):
    url = f"/api/resource/{layer.id}"

    ngw_webtest_app.put(
        url,
        json={"postgis_layer": {"where_expression": "src.fld_age >= 30"}},
        status=200,
    )

    resp = ngw_webtest_app.get(f"{url}/feature/", status=200)
    assert [f["id"] for f in resp.json] == [2, 3, 5]


def test_where_aggregate(layer, ngw_webtest_app):
    url = f"/api/resource/{layer.id}"

    ngw_webtest_app.put(
        url,
        json={"postgis_layer": {"where_expression": "src.fld_city = 'NYC'"}},
        status=200,
    )

    result = ngw_webtest_app.post(
        f"{url}/feature/aggregate",
        json={"items": [{"type": "min_max", "field": "age"}]},
        status=200,
    ).json
    assert result["items"] == [{"type": "min_max", "min": 25, "max": 35}]


def test_where_extra_function(layer):
    layer.connection.where_functions = ["ascii"]
    set_where(layer, "ascii(src.fld_city) = 78")
    assert fetch_ids(layer) == [1, 3, 5]

    layer.connection.where_functions = []
    with pytest.raises(ValidationError, match="ascii"):
        fetch_ids(layer)


def test_where_extra_operator(layer):
    layer.connection.where_operators = ["~"]
    set_where(layer, "src.fld_city ~ '^NY'")
    assert fetch_ids(layer) == [1, 3, 5]

    layer.connection.where_operators = []
    with pytest.raises(ValidationError, match="~"):
        fetch_ids(layer)


def test_where_serializer(layer, ngw_webtest_app):
    url = f"/api/resource/{layer.id}"

    ngw_webtest_app.put(
        url,
        json={"postgis_layer": {"where_expression": "  src.fld_age >= 30  "}},
        status=200,
    )
    resp = ngw_webtest_app.get(url, status=200)
    layer = PostgisLayer.filter_by(id=layer.id).one()
    assert resp.json["postgis_layer"]["where_expression"] == "src.fld_age >= 30"
    assert fetch_ids(layer) == [2, 3, 5]

    ngw_webtest_app.put(
        url,
        json={"postgis_layer": {"where_expression": "src.id IN (SELECT 1)"}},
        status=422,
    )

    ngw_webtest_app.put(
        url,
        json={"postgis_layer": {"where_expression": ""}},
        status=200,
    )
    resp = ngw_webtest_app.get(url, status=200)
    layer = PostgisLayer.filter_by(id=layer.id).one()
    assert resp.json["postgis_layer"]["where_expression"] is None
    assert layer.where_expression is None
    assert layer.where_functions is None
    assert fetch_ids(layer) == [1, 2, 3, 4, 5]


def test_connection_where_functions_serializer(layer, ngw_webtest_app):
    curl = f"/api/resource/{layer.connection_id}"
    lurl = f"/api/resource/{layer.id}"

    ngw_webtest_app.put(
        curl,
        json={"postgis_connection": {"where_functions": ["Ascii", " my_func "]}},
        status=200,
    )
    resp = ngw_webtest_app.get(curl, status=200)
    assert resp.json["postgis_connection"]["where_functions"] == ["ascii", "my_func"]

    ngw_webtest_app.put(
        lurl,
        json={"postgis_layer": {"where_expression": "ascii(src.fld_city) = 78"}},
        status=200,
    )

    ngw_webtest_app.put(
        curl,
        json={"postgis_connection": {"where_functions": ["my_func"]}},
        status=422,
    )
    ngw_webtest_app.put(
        curl,
        json={"postgis_connection": {"where_functions": ["ascii", "my_func"]}},
        status=200,
    )

    layer = PostgisLayer.filter_by(id=layer.id).one()
    assert fetch_ids(layer) == [1, 3, 5]


def test_connection_default_function_does_not_block(layer, ngw_webtest_app):
    ngw_webtest_app.put(
        f"/api/resource/{layer.id}",
        json={"postgis_layer": {"where_expression": "lower(src.fld_city) = 'nyc'"}},
        status=200,
    )
    curl = f"/api/resource/{layer.connection_id}"
    ngw_webtest_app.put(
        curl,
        json={"postgis_connection": {"where_functions": ["ascii"]}},
        status=200,
    )

    resp = ngw_webtest_app.get(curl, status=200)
    assert resp.json["postgis_connection"]["where_functions"] == ["ascii"]

    layer = PostgisLayer.filter_by(id=layer.id).one()
    assert layer.where_functions == ["lower"]
    assert fetch_ids(layer) == [1, 3, 5]


def test_connection_where_functions_invalid_name(ngw_webtest_app, ngw_resource_group):
    resp = ngw_webtest_app.post(
        "/api/resource/",
        json={
            "resource": {
                "cls": "postgis_connection",
                "display_name": "invalid where functions",
                "parent": {"id": ngw_resource_group},
            },
            "postgis_connection": {
                "hostname": "localhost",
                "database": "database",
                "username": "username",
                "password": "password",
                "where_functions": ["1bad"],
            },
        },
        status=422,
    )
    assert "Invalid WHERE function name: 1bad" in resp.json["message"]


def test_connection_where_operators_serializer(layer, ngw_webtest_app):
    curl = f"/api/resource/{layer.connection_id}"
    lurl = f"/api/resource/{layer.id}"

    ngw_webtest_app.put(
        curl,
        json={"postgis_connection": {"where_operators": [" ~ ", " !~* "]}},
        status=200,
    )
    resp = ngw_webtest_app.get(curl, status=200)
    assert resp.json["postgis_connection"]["where_operators"] == ["!~*", "~"]

    ngw_webtest_app.put(
        lurl,
        json={"postgis_layer": {"where_expression": "src.fld_city ~ '^NY'"}},
        status=200,
    )

    ngw_webtest_app.put(
        curl,
        json={"postgis_connection": {"where_operators": ["!~*"]}},
        status=422,
    )
    ngw_webtest_app.put(
        curl,
        json={"postgis_connection": {"where_operators": ["!~*", "~"]}},
        status=200,
    )

    layer = PostgisLayer.filter_by(id=layer.id).one()
    assert fetch_ids(layer) == [1, 3, 5]


def test_connection_where_operators_invalid_name(ngw_webtest_app, ngw_resource_group):
    resp = ngw_webtest_app.post(
        "/api/resource/",
        json={
            "resource": {
                "cls": "postgis_connection",
                "display_name": "invalid where operators",
                "parent": {"id": ngw_resource_group},
            },
            "postgis_connection": {
                "hostname": "localhost",
                "database": "database",
                "username": "username",
                "password": "password",
                "where_operators": ["bad;operator"],
            },
        },
        status=422,
    )
    assert "Invalid WHERE operator name: bad;operator" in resp.json["message"]


@pytest.mark.parametrize(
    "expression, functions, ids",
    (
        ("coalesce(src.fld_city, '') = 'NYC'", ["coalesce"], [1, 3, 5]),
        ("greatest(src.fld_age, 0) > 30", ["greatest"], [3, 5]),
        ("CURRENT_DATE > src.fld_birth_date", ["current_date"], [1, 2, 3, 4, 5]),
    ),
)
def test_where_function_like_constructs(layer, ngw_webtest_app, expression, functions, ids):
    # These are parsed into dedicated AST nodes rather than FuncCall, but they
    # are functions and must be recorded in where_functions like any other.
    ngw_webtest_app.put(
        f"/api/resource/{layer.id}",
        json={"postgis_layer": {"where_expression": expression}},
        status=200,
    )
    layer = PostgisLayer.filter_by(id=layer.id).one()
    assert layer.where_functions == functions
    assert fetch_ids(layer) == ids


@pytest.mark.parametrize(
    "expression, ids",
    (
        ("CASE WHEN src.fld_age >= 30 THEN 1 ELSE 0 END = 1", [2, 3, 5]),
        ("src.fld_city::text = 'NYC'", [1, 3, 5]),
        ("src.fld_age IS NOT NULL", [1, 2, 3, 4, 5]),
    ),
)
def test_where_syntax_constructs(layer, ngw_webtest_app, expression, ids):
    # Grammar constructs need no allowlist entries and add no recorded functions.
    ngw_webtest_app.put(
        f"/api/resource/{layer.id}",
        json={"postgis_layer": {"where_expression": expression}},
        status=200,
    )
    layer = PostgisLayer.filter_by(id=layer.id).one()
    assert layer.where_functions is None
    assert fetch_ids(layer) == ids


def test_where_layer_moved_to_connection_with_insufficient_whitelist(
    layer, ngw_webtest_app, ngw_resource_group
):
    curl = f"/api/resource/{layer.connection_id}"
    lurl = f"/api/resource/{layer.id}"

    ngw_webtest_app.put(
        curl,
        json={"postgis_connection": {"where_operators": ["~"]}},
        status=200,
    )
    ngw_webtest_app.put(
        lurl,
        json={"postgis_layer": {"where_expression": "src.fld_city ~ '^NY'"}},
        status=200,
    )
    assert fetch_ids(PostgisLayer.filter_by(id=layer.id).one()) == [1, 3, 5]

    source = layer.connection
    resp = ngw_webtest_app.post(
        "/api/resource/",
        json={
            "resource": {
                "cls": "postgis_connection",
                "display_name": "connection without ~ operator",
                "parent": {"id": ngw_resource_group},
            },
            "postgis_connection": {
                "hostname": source.hostname,
                "port": source.port,
                "database": source.database,
                "username": source.username,
                "password": source.password,
            },
        },
        status=201,
    )
    other_id = resp.json["id"]
    resp = ngw_webtest_app.get(f"/api/resource/{other_id}", status=200)
    assert resp.json["postgis_connection"]["where_operators"] == []

    # Moving to a connection that doesn't allow '~' is rejected at save time.
    resp = ngw_webtest_app.put(
        lurl,
        json={"postgis_layer": {"connection": {"id": other_id}, "fields": "keep"}},
        status=422,
    )
    assert "WHERE expression uses operators that are not allowed: ~" in resp.json["message"]

    DBSession.expire_all()
    unchanged = PostgisLayer.filter_by(id=layer.id).one()
    assert unchanged.connection_id == source.id
    assert fetch_ids(unchanged) == [1, 3, 5]

    # Once the target connection allows '~', the same move succeeds.
    ngw_webtest_app.put(
        f"/api/resource/{other_id}",
        json={"postgis_connection": {"where_operators": ["~"]}},
        status=200,
    )
    ngw_webtest_app.put(
        lurl,
        json={"postgis_layer": {"connection": {"id": other_id}, "fields": "keep"}},
        status=200,
    )

    DBSession.expire_all()
    moved = PostgisLayer.filter_by(id=layer.id).one()
    assert moved.connection_id == other_id
    assert fetch_ids(moved) == [1, 3, 5]
