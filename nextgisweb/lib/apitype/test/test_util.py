from typing import Annotated

import pytest

from ..util import annotate, disannotate, unannotate


@pytest.mark.parametrize(
    "origin, tdef, annotations",
    [
        [str, str, ()],
        [str, Annotated[str, 1, 2], (1, 2)],
        [str, Annotated[Annotated[str, 1], 2], (1, 2)],
        [str | int, Annotated[str | int, 1, 2], (1, 2)],
    ],
)
def test_annotated(origin, tdef, annotations):
    assert unannotate(tdef) == origin
    assert disannotate(tdef) == (origin, annotations)
    assert annotate(origin, annotations) == tdef
