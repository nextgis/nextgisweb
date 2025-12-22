from typing import Any, Generator, Union

import sqlalchemy as sa
import sqlalchemy.orm as orm
from msgspec import UNSET, Struct, UnsetType, to_builtins
from sqlalchemy.dialects import postgresql as pg
from zope.sqlalchemy import mark_changed

from nextgisweb.env import Base
from nextgisweb.lib.datetime import utcnow_naive

from nextgisweb.auth import User
from nextgisweb.resource import Resource

from .exception import TransactionOperationConflict


class FeatureLayerTransaction(Base):
    __tablename__ = "feature_layer_transaction"

    id = sa.Column(sa.Integer, primary_key=True)
    resource_id = sa.Column(sa.ForeignKey(Resource.id, ondelete="CASCADE"), nullable=False)
    epoch = sa.Column(sa.Integer, nullable=True)
    user_id = sa.Column(sa.ForeignKey(User.id, ondelete="CASCADE"), nullable=False)
    started = sa.Column(sa.DateTime, nullable=False, default=utcnow_naive)
    committed = sa.Column(sa.DateTime, nullable=True)

    resource = orm.relationship(Resource)
    user = orm.relationship(User)

    def put_operation(
        self,
        seqnum: int,
        payload: Union[Struct, None],
        params: Union[Struct, UnsetType],
    ):
        p_values = dict(
            p_seqnum=seqnum,
            p_payload=to_builtins(payload),
            p_params=to_builtins(params) if params is not UNSET else None,
        )

        if qexs_row := self.__execute(_sel_existing, **p_values).first():
            is_distinct, is_error = qexs_row
            if not is_error:
                if is_distinct:
                    raise TransactionOperationConflict(seqnum)
            elif payload:
                self.__execute(_upd_operation, **p_values)
            else:
                self.__execute(_del_operation, **p_values)
        elif payload:
            self.__execute(_ins_operation, **p_values)

    def actions(self) -> list[str]:
        return list(self.__execute(_sel_actions).scalars())

    def errors(self) -> list[tuple[int, Any]]:
        return [(sn, error) for sn, error in self.__execute(_sel_errors)]

    def operations(self) -> Generator[tuple[int, Any, Any], None, None]:
        yield from ((sn, pl, pr) for sn, pl, pr in self.__execute(_sel_operations))

    def write_error(self, seqnum, error: Any):
        self.__execute(_upd_error, p_seqnum=seqnum, p_error=to_builtins(error))

    def write_result(self, seqnum: int, value: Struct):
        self.__execute(_ins_result, p_seqnum=seqnum, p_value=to_builtins(value))

    def read_results(self) -> Generator[tuple[int, Any], None, None]:
        yield from ((sn, val) for sn, val in self.__execute(_sel_result))

    def __execute(self, query, **kwargs):
        session = sa.inspect(self).session
        result = session.execute(query, dict(p_transaction_id=self.id, **kwargs))
        if isinstance(query, (sa.sql.Insert, sa.sql.Update, sa.sql.Delete)):
            mark_changed(session)
        return result


# Tables for operations and results. It looks like we don't need SA ORM here

_txn_id_fk = lambda: sa.ForeignKey(FeatureLayerTransaction.id, ondelete="CASCADE")

_tab_operation = sa.Table(
    "feature_layer_transaction_operation",
    Base.metadata,
    sa.Column("transaction_id", _txn_id_fk(), primary_key=True),
    sa.Column("seqnum", sa.Integer, primary_key=True),
    sa.Column("payload", pg.JSONB, nullable=False),
    sa.Column("params", pg.JSONB, nullable=True),
    sa.Column("error", pg.JSONB, nullable=True),
)

_tab_result = sa.Table(
    "feature_layer_transaction_result",
    Base.metadata,
    sa.Column("transaction_id", _txn_id_fk(), primary_key=True),
    sa.Column("seqnum", sa.Integer, primary_key=True),
    sa.Column("value", pg.JSONB, nullable=False),
)

# Prebuilt queries

_p_transaction_id = sa.bindparam("p_transaction_id")
_p_seqnum = sa.bindparam("p_seqnum")
_p_payload = sa.bindparam("p_payload")
_p_params = sa.bindparam("p_params")
_p_error = sa.bindparam("p_error")
_p_value = sa.bindparam("p_value")

_sel_existing = sa.select(
    sa.or_(
        _tab_operation.c.payload.op("IS DISTINCT FROM")(_p_payload),
        _tab_operation.c.params.op("IS DISTINCT FROM")(_p_params),
    ).label("is_distinct"),
    _tab_operation.c.error.isnot(None).label("is_error"),
).filter_by(transaction_id=_p_transaction_id, seqnum=_p_seqnum)

_ins_operation = sa.insert(_tab_operation).values(
    transaction_id=_p_transaction_id,
    seqnum=_p_seqnum,
    payload=_p_payload,
    params=_p_params,
)

_del_operation = sa.delete(_tab_operation).filter_by(
    transaction_id=_p_transaction_id,
    seqnum=_p_seqnum,
)

_upd_operation = (
    sa.update(_tab_operation)
    .values(payload=_p_payload, params=_p_params, error=sa.null())
    .filter_by(transaction_id=_p_transaction_id, seqnum=_p_seqnum)
)

_sel_errors = (
    sa.select(_tab_operation.c.seqnum, _tab_operation.c.error)
    .filter_by(transaction_id=_p_transaction_id)
    .where(_tab_operation.c.error.isnot(None))
    .order_by(_tab_operation.c.seqnum)
)

_sel_actions = sa.select(
    _tab_operation.c.payload.op("->")(sa.text("'action'")).distinct()
).filter_by(transaction_id=_p_transaction_id)

_sel_operations = (
    sa.select(
        _tab_operation.c.seqnum,
        _tab_operation.c.payload,
        _tab_operation.c.params,
    )
    .filter_by(transaction_id=_p_transaction_id)
    .order_by(_tab_operation.c.seqnum)
)

_upd_error = (
    sa.update(_tab_operation)
    .values(error=_p_error)
    .filter_by(transaction_id=_p_transaction_id, seqnum=_p_seqnum)
)

_ins_result = sa.insert(_tab_result).values(
    transaction_id=_p_transaction_id,
    seqnum=_p_seqnum,
    value=_p_value,
)

_sel_result = (
    sa.select(_tab_result.c.seqnum, _tab_result.c.value)
    .filter_by(transaction_id=_p_transaction_id)
    .order_by(_tab_result.c.seqnum)
)
