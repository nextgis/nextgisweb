from collections.abc import Callable, Generator
from contextlib import contextmanager
from datetime import datetime

from nextgisweb.lib.json import dumps

from nextgisweb.pyramid.tomb import Request

from ..component import AuditComponent
from .base import BackendBase


class FileBackend(BackendBase):
    identity = "file"

    def __init__(self, comp: AuditComponent) -> None:
        super().__init__(comp)
        # NOTE: Buffering = 1 for line buffering
        self.fd = open(self.options["path"], "a", buffering=1)

    def _write(self, tstamp: datetime, body: dict) -> None:
        print('{"@timestamp":' + dumps(tstamp) + "," + dumps(body)[1:], file=self.fd)

    @contextmanager
    def __call__(self, request: Request) -> Generator[Callable[[datetime, dict], None]]:
        yield self._write
