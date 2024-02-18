from typing import Optional, Union

import pytest
from typing_extensions import Annotated

from ..util import annotate, disannotate, is_optional, unannotate


@pytest.mark.parametrize(
    "origin, tdef, annotations",
    [
        [str, str, ()],
        [str, Annotated[str, 1, 2], (1, 2)],
        [str, Annotated[Annotated[str, 1], 2], (1, 2)],
        [Union[str, int], Annotated[Union[str, int], 1, 2], (1, 2)],
    ],
)
def test_annotated(origin, tdef, annotations):
    assert unannotate(tdef) == origin
    assert disannotate(tdef) == (origin, annotations)
    assert annotate(origin, annotations) == tdef


@pytest.mark.parametrize(
    "tdef, expected",
    [
        [str, False],
        [Optional[str], True],
        [Annotated[Optional[str], 1, 2], True],
        [Union[str, Union[int, None]], True],
        [Union[str, Annotated[None, 1, 2]], True],
    ],
)
def test_is_opional(tdef, expected):
    assert is_optional(tdef)[0] == expected
