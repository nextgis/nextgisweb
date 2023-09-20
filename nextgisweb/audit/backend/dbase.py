from contextlib import contextmanager
from datetime import datetime, timedelta
from functools import partial

import transaction
from sqlalchemy import create_engine
from zope.sqlalchemy import mark_changed

from nextgisweb.env import DBSession
from nextgisweb.lib import json

from ..component import AuditComponent
from ..model import tab_journal
from .base import BackendBase


class DatabaseBackend(BackendBase):
    identity = "dbase"
    retention: timedelta

    def __init__(self, comp: AuditComponent) -> None:
        super().__init__(comp)
        self.engine = create_engine(
            comp.env.core._engine_url(),
            json_serializer=json.dumps,
            json_deserializer=json.loads,
            isolation_level="AUTOCOMMIT",
            pool_pre_ping=True,
        )

        self.insert = tab_journal.insert()

    def _write(self, tstamp, data, *, con):
        con.execute(self.insert.values(tstamp=tstamp, data=data))

    @contextmanager
    def __call__(self, request):
        con = self.engine.connect()
        try:
            yield partial(self._write, con=con)
        finally:
            con.close()

    def maintenance(self):
        super().maintenance()
        with transaction.manager:
            ts = datetime.utcnow() - self.options["retention"]
            q_delete = tab_journal.delete().where(tab_journal.c.tstamp < ts)
            DBSession.connection().execute(q_delete)
            mark_changed(DBSession())
