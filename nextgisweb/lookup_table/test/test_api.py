import pytest
import transaction

from .. import LookupTable

pytestmark = pytest.mark.usefixtures("ngw_resource_defaults", "ngw_auth_administrator")


@pytest.fixture(scope="module")
def lt_id():
    with transaction.manager:
        items = [
            ("z", "b"),
            ("a", "x"),
            ("l", "p"),
            ("k", "a"),
        ]
        res = LookupTable(value=items).persist()

    yield res.id


def items_product():
    items = dict(z="b", a="x", l="p", k="a")
    for sort, expected in (
        (
            "VALUE_ASC",
            (
                ("k", "a"),
                ("z", "b"),
                ("l", "p"),
                ("a", "x"),
            ),
        ),
        (
            "KEY_DESC",
            (
                ("z", "b"),
                ("l", "p"),
                ("k", "a"),
                ("a", "x"),
            ),
        ),
        (
            "CUSTOM",
            (
                ("z", "b"),
                ("a", "x"),
                ("l", "p"),
                ("k", "a"),
            ),
        ),
    ):
        data = dict(sort=sort, items=items)
        yield pytest.param(data, expected, id=sort.lower())

    expected_ordered = (("l", "p"), ("a", "x"), ("z", "b"), ("k", "a"))
    yield pytest.param(
        dict(sort="CUSTOM", order=("l", "a", "z", "k")), expected_ordered, id="custom-ordered"
    )


@pytest.mark.parametrize("data, expected", items_product())
def test_update(data, expected, lt_id, ngw_webtest_app):
    url = f"/api/resource/{lt_id}"

    pdata = dict(lookup_table=data)
    ngw_webtest_app.put_json(url, pdata)

    resp = ngw_webtest_app.get(url, status=200)
    ltdata = resp.json["lookup_table"]

    assert ltdata["sort"] == data["sort"]

    items = ltdata["items"]
    order = ltdata["order"]
    assert len(items) == len(expected) == len(order)

    for i, (p1, p2) in enumerate(zip(items.items(), expected)):
        assert p1 == p2
        assert order[i] == p1[0]
