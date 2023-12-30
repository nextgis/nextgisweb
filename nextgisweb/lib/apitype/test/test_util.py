from typing import Optional, Union

import pytest
from typing_extensions import Annotated

from ..util import deannotated, expannotated


@pytest.mark.parametrize(
    "input, expected",
    [
        [str, str],
        [Union[int, str], Union[int, str]],
        [Optional[str], Optional[str]],
        [Annotated[str, "annotation"], str],
    ],
)
def test_deannotated(input, expected):
    assert deannotated(input) == expected


@pytest.mark.parametrize(
    "input, expected_origin, expected_annotations",
    [
        [Annotated[str, "foo", "bar"], str, ("foo", "bar")],
    ],
)
def test_expannotated(input, expected_origin, expected_annotations):
    origin, annotations = expannotated(input)
    assert origin == expected_origin
    assert annotations == expected_annotations
