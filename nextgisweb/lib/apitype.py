from typing import Any, TypeVar

from typing_extensions import Annotated

T = TypeVar('T')

JSONType = Annotated[Any, None]

AsJSONMarker = type('AsJSONMarker', (), {})()
AsJSON = Annotated[T, AsJSONMarker]
