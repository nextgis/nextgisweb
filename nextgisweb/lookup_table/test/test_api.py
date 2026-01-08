import pytest
import transaction

from nextgisweb.resource.test import ResourceAPI

from .. import LookupTable

pytestmark = pytest.mark.usefixtures("ngw_resource_defaults", "ngw_auth_administrator")


@pytest.fixture(scope="module")
def resource_id():
    with transaction.manager:
        res = LookupTable(
            value=[
                ("z", "b"),
                ("a", "x"),
                ("l", "p"),
                ("k", "a"),
            ]
        ).persist()
    return res.id


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
def test_update(data, expected, resource_id):
    rapi = ResourceAPI()

    rapi.update(resource_id, {"lookup_table": data})
    ltdata = rapi.read(resource_id)["lookup_table"]

    assert ltdata["sort"] == data["sort"]

    items = ltdata["items"]
    order = ltdata["order"]
    assert len(items) == len(expected) == len(order)

    for i, (p1, p2) in enumerate(zip(items.items(), expected)):
        assert p1 == p2
        assert order[i] == p1[0]
