from enum import Enum
from typing import List, Optional, TypedDict, Union

from typing_extensions import Annotated

from nextgisweb.lib.apitype import AnyOf, AsJSON, ContentType, JSONType, StatusCode

from ..tomb import Configurator

config = Configurator(settings={})


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


# Query parameters can be declared as keyword-only parameters of view.
# Parameters descriptions from docstrings are mapped to OpenAPI descriptions.
def param(
    request,
    *,
    rstr: str,
    rint: int,
    enum: EnumParam = EnumParam.FOO,
    ostr: Optional[str],
    lstr: List[str],
) -> JSONType:
    """Handle basic types of query parameters

    :param rstr: Required string
    :param rint: Required integer
    :param enum: Enum with default value
    :param ostr: Optional string, None is default
    :param lstr: List of strings
    """
    return "OK"


def anyof(
    request,
) -> AnyOf[
    AsJSON[Union[str, int, bool]],
    Annotated[str, StatusCode(201), ContentType("text/plain")],
]:
    """Respond with different content types and status codes"""
    return "OK"


def body(
    request,
    *,
    body: AnyOf[
        Annotated[str, ContentType("application/json")],
        Annotated[str, ContentType("text/plain")],
    ],
) -> JSONType:
    """Decode request body depending on its content type"""
    return "OK"


class FooResponse(TypedDict):
    foo: str


class BarResponse(TypedDict):
    bar: str


def tdict(
    request,
) -> AnyOf[Annotated[FooResponse, StatusCode(200)], Annotated[BarResponse, StatusCode(201)],]:
    """Generate response from TypedDict"""
    return FooResponse(foo="foo")


config.add_route("json", "/json", post=json)
config.add_route("param", "/param", get=param)
config.add_route("anyof", "/anyof", get=anyof)
config.add_route("body", "/body", post=body)
config.add_route("tdict", "/tdict", get=tdict)


config.commit()
