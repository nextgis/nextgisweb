from enum import Enum
from typing import Dict, List, Union

from msgspec import Meta
from typing_extensions import Annotated

from nextgisweb.lib.apitype import AnyOf, AsJSON, ContentType, JSONType, Query, StatusCode
from nextgisweb.lib.apitype.test.test_param import EnumA, LiteralA, StructA

from ..tomb import Configurator

config = Configurator(settings={})


def path(
    request,
    foo: Annotated[int, Meta(description="Foo")],
    bar: Annotated[int, Meta(gt=0, description="Bar")],
):
    pass


config.add_route("path", "/path/{foo}/{bar}", types=dict(foo=int, bar=int), get=path)


def query_primitive(
    request,
    *,
    str: Annotated[str, Meta(description="String")],
    int: Annotated[int, Meta(description="Integer")],
    bool: Annotated[bool, Meta(description="Boolean")],
    float: Annotated[float, Meta(description="Float")],
    enum: Annotated[EnumA, Meta(description="Enum")],
    literal: Annotated[LiteralA, Meta(description="Literal")],
):
    "Primitive query params"


def query_array(
    request,
    *,
    str: Annotated[List[str], Meta(description="List with default")] = [],
    int: Annotated[List[int], Meta(min_length=2, description="Two or more list")],
):
    "Array query params"


def query_object(
    request,
    *,
    sto: Annotated[StructA, Meta(description="Struct")],
    sts: Annotated[StructA, Query(spread=True), Meta(description="Spreaded struct")],
    dsi: Annotated[Dict[str, int], Meta(description="String to integer mapping")],
):
    "Object query params"


config.add_route("query_primitive", "/query/primitive", get=query_primitive)
config.add_route("query_array", "/query/array", get=query_array)
config.add_route("query_object", "/query/object", get=query_object)


# JSON without type specification, orjson parses and renders them. JSONType is
# an annotated synonym of Any from typing point of view.
#
# Docstrings are mapped as follows:
#
#   * Short description to method summary
#   * Long description to method description
#   * Return description to response description
#
def json(request, body: JSONType) -> JSONType:
    """Decode and encode submitted JSON body

    Returns back any JSON posted without changes. The endpoint just decodes and
    encodes the message back and forth.

    :returns: Relayed JSON"""
    return "OK"


class EnumParam(Enum):
    FOO = "foo"
    BAR = "bar"


def anyof(
    request,
) -> AnyOf[
    AsJSON[Union[str, int, bool]],
    Annotated[str, StatusCode(201), ContentType("text/plain")],
]:
    """Respond with different content types and status codes"""
    return "OK"


config.add_route("json", "/json", post=json)
config.add_route("anyof", "/anyof", get=anyof)


config.commit()
