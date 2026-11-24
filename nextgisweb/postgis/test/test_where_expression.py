import pytest

from nextgisweb.env import DBSession

from nextgisweb.core.exception import ValidationError
from nextgisweb.postgis import PostgisLayer
from nextgisweb.postgis.where import validate_where_expression

pytestmark = pytest.mark.usefixtures("ngw_resource_defaults", "ngw_auth_administrator")


@pytest.fixture
def layer(postgis_filter_layer_id):
    return PostgisLayer.filter_by(id=postgis_filter_layer_id).one()


def allowlist(functions=(), operators=()):
    return {"functions": list(functions), "operators": list(operators)}


def set_where(layer, expression):
    validated = validate_where_expression(
        expression,
        layer.allowed_where_functions(),
        layer.allowed_where_operators(),
    )
    layer.where_expression = validated.expression


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
    layer.connection.where_allowlist = allowlist(functions=["ascii"])
    set_where(layer, "ascii(src.fld_city) = 78")
    assert fetch_ids(layer) == [1, 3, 5]

    # Removing an extra name is allowed, but the next query must reject it.
    layer.connection.where_allowlist = allowlist()
    with pytest.raises(ValidationError, match="ascii"):
        fetch_ids(layer)


def test_where_extra_operator(layer):
    layer.connection.where_allowlist = allowlist(operators=["~"])
    set_where(layer, "src.fld_city ~ '^NY'")
    assert fetch_ids(layer) == [1, 3, 5]

    layer.connection.where_allowlist = allowlist()
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

    resp = ngw_webtest_app.put(
        url,
        json={"postgis_layer": {"where_expression": "src.id IN (SELECT 1)"}},
        status=422,
    )
    assert "Node 'SubLink' is not allowed in the WHERE expression." in resp.json["message"]

    ngw_webtest_app.put(
        url,
        json={"postgis_layer": {"where_expression": ""}},
        status=200,
    )
    resp = ngw_webtest_app.get(url, status=200)
    layer = PostgisLayer.filter_by(id=layer.id).one()
    assert resp.json["postgis_layer"]["where_expression"] is None
    assert layer.where_expression is None
    assert fetch_ids(layer) == [1, 2, 3, 4, 5]


def test_where_allowlisted_function(layer, ngw_webtest_app):
    curl = f"/api/resource/{layer.connection_id}"
    lurl = f"/api/resource/{layer.id}"
    expression = "regexp_replace(src.fld_city, 'N', 'X') = 'XYC'"

    resp = ngw_webtest_app.put(
        lurl, json={"postgis_layer": {"where_expression": expression}}, status=422
    )
    assert "Function 'regexp_replace' is not allowed" in resp.json["message"]

    ngw_webtest_app.put(
        curl,
        json={"postgis_connection": {"where_allowlist": allowlist(functions=["regexp_replace"])}},
        status=200,
    )
    DBSession.expire_all()
    ngw_webtest_app.put(lurl, json={"postgis_layer": {"where_expression": expression}}, status=200)

    DBSession.expire_all()
    assert fetch_ids(PostgisLayer.filter_by(id=layer.id).one()) == [1, 3, 5]


def test_connection_where_allowlist_functions_serializer(layer, ngw_webtest_app):
    curl = f"/api/resource/{layer.connection_id}"
    lurl = f"/api/resource/{layer.id}"

    ngw_webtest_app.put(
        curl,
        json={
            "postgis_connection": {"where_allowlist": allowlist(functions=["Ascii", " my_func "])}
        },
        status=200,
    )
    resp = ngw_webtest_app.get(curl, status=200)
    assert resp.json["postgis_connection"]["where_allowlist"] == {
        "functions": ["ascii", "my_func"],
        "operators": [],
    }

    ngw_webtest_app.put(
        lurl,
        json={"postgis_layer": {"where_expression": "ascii(src.fld_city) = 78"}},
        status=200,
    )

    # A used extra name may be removed from the connection allowlist: there is
    # no stored per-layer dependency to protect. Runtime validation rejects it.
    ngw_webtest_app.put(
        curl,
        json={"postgis_connection": {"where_allowlist": allowlist(functions=["my_func"])}},
        status=200,
    )
    DBSession.expire_all()
    removed = PostgisLayer.filter_by(id=layer.id).one()
    with pytest.raises(ValidationError, match="ascii"):
        fetch_ids(removed)

    ngw_webtest_app.put(
        curl,
        json={
            "postgis_connection": {"where_allowlist": allowlist(functions=["ascii", "my_func"])}
        },
        status=200,
    )
    DBSession.expire_all()
    assert fetch_ids(PostgisLayer.filter_by(id=layer.id).one()) == [1, 3, 5]


def test_connection_default_function_does_not_block(layer, ngw_webtest_app):
    ngw_webtest_app.put(
        f"/api/resource/{layer.id}",
        json={"postgis_layer": {"where_expression": "lower(src.fld_city) = 'nyc'"}},
        status=200,
    )
    curl = f"/api/resource/{layer.connection_id}"
    ngw_webtest_app.put(
        curl,
        json={"postgis_connection": {"where_allowlist": allowlist(functions=["ascii"])}},
        status=200,
    )

    resp = ngw_webtest_app.get(curl, status=200)
    assert resp.json["postgis_connection"]["where_allowlist"] == {
        "functions": ["ascii"],
        "operators": [],
    }

    DBSession.expire_all()
    assert fetch_ids(PostgisLayer.filter_by(id=layer.id).one()) == [1, 3, 5]


@pytest.mark.parametrize(
    "where_allowlist, message",
    (
        ({"functions": ["1bad"]}, "Invalid WHERE function name: 1bad"),
        ({"operators": ["bad;operator"]}, "Invalid WHERE operator name: bad;operator"),
        ({"unexpected": []}, "unexpected"),
    ),
)
def test_connection_where_allowlist_invalid(
    ngw_webtest_app, ngw_resource_group, where_allowlist, message
):
    resp = ngw_webtest_app.post(
        "/api/resource/",
        json={
            "resource": {
                "cls": "postgis_connection",
                "display_name": "invalid where allowlist",
                "parent": {"id": ngw_resource_group},
            },
            "postgis_connection": {
                "hostname": "localhost",
                "database": "database",
                "username": "username",
                "password": "password",
                "where_allowlist": where_allowlist,
            },
        },
        status=422,
    )
    assert message in resp.json["message"]


def test_connection_where_allowlist_operators_serializer(layer, ngw_webtest_app):
    curl = f"/api/resource/{layer.connection_id}"
    lurl = f"/api/resource/{layer.id}"

    ngw_webtest_app.put(
        curl,
        json={"postgis_connection": {"where_allowlist": allowlist(operators=[" ~ ", " !~* "])}},
        status=200,
    )
    resp = ngw_webtest_app.get(curl, status=200)
    assert resp.json["postgis_connection"]["where_allowlist"] == {
        "functions": [],
        "operators": ["!~*", "~"],
    }

    ngw_webtest_app.put(
        lurl,
        json={"postgis_layer": {"where_expression": "src.fld_city ~ '^NY'"}},
        status=200,
    )

    ngw_webtest_app.put(
        curl,
        json={"postgis_connection": {"where_allowlist": allowlist(operators=["!~*"])}},
        status=200,
    )
    DBSession.expire_all()
    removed = PostgisLayer.filter_by(id=layer.id).one()
    with pytest.raises(ValidationError, match="~"):
        fetch_ids(removed)

    ngw_webtest_app.put(
        curl,
        json={"postgis_connection": {"where_allowlist": allowlist(operators=["~"])}},
        status=200,
    )
    DBSession.expire_all()
    assert fetch_ids(PostgisLayer.filter_by(id=layer.id).one()) == [1, 3, 5]


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
    # are functions and must be checked against the allowlist at query time.
    ngw_webtest_app.put(
        f"/api/resource/{layer.id}",
        json={"postgis_layer": {"where_expression": expression}},
        status=200,
    )
    layer = PostgisLayer.filter_by(id=layer.id).one()
    assert layer.validate_where().functions == tuple(functions)
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
    # Grammar constructs need no allowlist entries and record no function names.
    ngw_webtest_app.put(
        f"/api/resource/{layer.id}",
        json={"postgis_layer": {"where_expression": expression}},
        status=200,
    )
    layer = PostgisLayer.filter_by(id=layer.id).one()
    assert layer.validate_where().functions == ()
    assert fetch_ids(layer) == ids


def test_where_names_are_not_stored(layer):
    assert not hasattr(layer, "where_functions")
    assert not hasattr(layer, "where_operators")
    assert not hasattr(layer.connection, "where_functions")
    assert not hasattr(layer.connection, "where_operators")


def test_where_layer_moved_to_connection_with_insufficient_whitelist(
    layer, ngw_webtest_app, ngw_resource_group
):
    curl = f"/api/resource/{layer.connection_id}"
    lurl = f"/api/resource/{layer.id}"

    ngw_webtest_app.put(
        curl,
        json={"postgis_connection": {"where_allowlist": allowlist(operators=["~"])}},
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
    assert resp.json["postgis_connection"]["where_allowlist"] == {
        "functions": [],
        "operators": [],
    }

    # The move succeeds: runtime validation, not save time, is authoritative.
    ngw_webtest_app.put(
        lurl,
        json={"postgis_layer": {"connection": {"id": other_id}, "fields": "keep"}},
        status=200,
    )

    DBSession.expire_all()
    moved = PostgisLayer.filter_by(id=layer.id).one()
    assert moved.connection_id == other_id
    with pytest.raises(ValidationError, match="~"):
        fetch_ids(moved)

    ngw_webtest_app.put(
        f"/api/resource/{other_id}",
        json={"postgis_connection": {"where_allowlist": allowlist(operators=["~"])}},
        status=200,
    )
    DBSession.expire_all()
    assert fetch_ids(PostgisLayer.filter_by(id=layer.id).one()) == [1, 3, 5]
