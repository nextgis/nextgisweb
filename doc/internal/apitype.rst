Describing API
==============

NextGIS Web incorporates type-annotated views and routes to:

- Ensure input data is valid
- Convert data into Python objects
- Create OpenAPI 3.1.0 schema

This approach heavily relies on Annotated type hints and the `MsgSpec library`_.
Currently, it supports a specific set of types, with plans to potentially add
more in the future, without attempting to accommodate every possible use case.

.. _msgspec library: https://jcristharif.com/msgspec/

Similar to the Pyramid framework, the handling of views is determined by their
signatures. The established conventions for these view signatures are:

- An argument named ``request`` is required at the first or second position
- If the ``request`` argument is the second, the first is a request context
- A request context argument can use any name, like ``resource`` or ``obj``
- An argument named ``body`` or ``json_body`` represents decoded request body
- Keyword-only arguments (after ``*``) represent query parameters
- The remaining arguments are treated as path parameters

Path parameters
---------------

Supported types: string (``str``) and integers (``int``) only. Behind the
scenes, values are decoded using MsgSpec, thus ``msgspec.Meta`` constraints
work.

.. code-block:: python

    from typing_extensions import Annotated
    from msgspec import Meta


    def path_param(request, param: Annotated[int, Meta(gt=0)]):
        ...


    def setup_pyramid(comp, config):
        config.add_route(
            "path_param",
            "/path/{param}",
            types=dict(param=int),
            get=path_param,
        )

In the example above, both ``/path/1`` and ``/path/0`` will match the route, but
for ``/path/0`` the ``422 Unprocessable Entity`` error will be returned as it
doesn't fit ``param > 0`` condition.

Query parameters
----------------

Supported types:

- Primitives:
      - Basic types: ``str``, ``int``, ``bool``, ``float``
      - ``enum.Enum`` with string values only
      - ``typing.Literal`` with string and integer values
- Arrays and lists of primitive types:
      - ``typing.List`` for variable-length uniform arrays
      - ``typing.Tuple`` for fixed-length and non-uniform lists
- Objects:
      - ``msgspec.Struct`` with primitive values
      - ``typing.Dict`` with primitive keys and values

.. code-block:: python

    from typing import Dict, List
    from msgspec import Struct


    class SomeStruct(Struct, kw_only=True):
        foo: str
        bar: str = "qux"


    def query_param(
        request,
        *,
        txt: str,
        num: int = 0,
        flag: bool = False,
        arr_str: List[str],
        arr_int: List[int] = [1, 2, 3],
        obj_struct: SomeStruct,
        obj_dict: Dict[str, int],
    ):
        ...

Arguments of primitive types can accept a default value. For booleans ``true``
and ``false`` values should be used, but ``yes`` and ``no`` are also accepted.
In case of multiple values of the same parameter (``...&num=1&num=2&...``), the
last value is decoded (``num == 2``).

List values are decoded using the ``form`` style array encoding with as
comma-separated values. Urlencoded commas are decoded as a part of values, plain
commas as list separators. An empty string value (``...&arr_str=&...``) is
decoded as an empty list.

Structs are decoded using the ``form`` style object encoding which means that
every struct field becomes an URL parameter (``...&foo=some&bar=other&...``).
This fact can help to reuse a Struct for a group of parameters without
repeating. Default values aren't allowed for structs, fields with no default
value are required parameters.

Dictionaries are decoded using the ``deepObject`` style encoding as their
possible keys are unknown (``...&obj_dict[a]=1&obj_dict[b]=2&...``). Default
values aren't allowed for dictionaries.

Request body
------------

For request bodies ``msgspec.Struct`` types should be used in most cases. Refer
to MsgSpec documentation for details, here is the minimal example:

.. code-block:: python

    from msgspec import Struct


    class SomeStruct(Struct, kw_only=True):
        foo: str
        bar: str = "qux"


    def body(request, body: SomeStruct):
        ...

Response
--------

View results are encoded using MsgSpec JSON encoder depending on return
annotation in the following cases:

- Declared as ``msgspec.Struct``
- Wrapped into the ``AsJSON`` helper
- Decorated with ``@viewargs(renderer="msgspec")``

The first two options support OpenAPI schema generation and static type
checking, here is the examples:

.. code-block:: python

    from msgspec import Struct
    from nextgisweb.lib.apitype import AsJSON
    from nextgisweb.pyramid import viewargs


    class SomeStruct(Struct, kw_only=True):
        foo: str
        bar: str = "qux"


    def struct(request) -> SomeStruct:
        return SomeStruct(foo="zoo")


    def helper(request) -> AsJSON[int]:
        return 1


    @viewargs(renderer="msgspec")
    def decorator(request):
        return 2

The ``StatusCode`` annotation can be used to declare non-200 status codes. It's
important to note that this annotation only modifies the OpenAPI schema. To set
the actual response status code, you should use
``request.response.status_code``:

.. code-block:: python

    from typing_extensions import Annotated
    from msgspec import Struct
    from nextgisweb.lib.apitype import StatusCode


    class SomeStruct(Struct, kw_only=True):
        foo: str


    def create(request) -> Annotated[SomeStruct, StatusCode(201)]:
        request.response.status_code = 201
        return SomeStruct(foo="zoo")

If there is no idea which JSON value to return as nothing, like ``DELETE``
methods, ``EmptyObject`` can be used. It accepts ``None`` and converts it to
``{}``. An empty object is better than the ``null`` value due to future
extensibility.

.. code-block:: python

    from nextgisweb.lib.apitype import EmptyObject


    def void(request) -> EmptyObject:
        pass
