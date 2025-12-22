from typing import Annotated, Union

import pytest

from ..util import annotate, disannotate, unannotate


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
