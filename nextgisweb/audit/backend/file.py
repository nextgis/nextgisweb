import io
from contextlib import contextmanager

from nextgisweb.lib.json import dumps

from ..component import AuditComponent
from .base import BackendBase


class FileBackend(BackendBase):
    identity = "file"

    def __init__(self, comp: AuditComponent) -> None:
        super().__init__(comp)
        # NOTE: Buffering = 1 for line buffering
        self.fd = io.open(self.options["path"], "a", buffering=1)

    def _write(self, tstamp, body):
        print('{"@timestamp":' + dumps(tstamp) + "," + dumps(body)[1:], file=self.fd)

    @contextmanager
    def __call__(self, request):
        yield self._write
