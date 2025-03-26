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


@pytest.mark.parametrize(
    "sort, expected",
    (
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
    ),
)
def test_update(sort, expected, lt_id, ngw_webtest_app):
    url = f"/api/resource/{lt_id}"

    pdata = dict(lookup_table=dict(sort=sort))
    ngw_webtest_app.put_json(url, pdata)

    resp = ngw_webtest_app.get(url, status=200)
    ltdata = resp.json["lookup_table"]

    assert ltdata["sort"] == sort

    items = ltdata["items"]
    assert len(items) == len(expected)

    for p1, p2 in zip(items.items(), expected):
        assert p1 == p2
