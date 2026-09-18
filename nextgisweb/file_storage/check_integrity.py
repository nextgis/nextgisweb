import os
from collections.abc import Iterator
from typing import cast

from nextgisweb.core import CheckIntegrityResult, check_integrity_hook

from .component import FileStorageComponent
from .model import FileObj


@check_integrity_hook()
def check_integrity(comp: FileStorageComponent) -> CheckIntegrityResult:
    for fileobj in cast(Iterator[FileObj], FileObj.query()):
        filepath = comp.filename(fileobj, makedirs=False)
        if not os.path.isfile(filepath):
            yield f"File '{filepath}' not found."
