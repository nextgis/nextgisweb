from datetime import datetime
from typing import TYPE_CHECKING, Any, Dict, List, Tuple, Type, Union

from msgspec import UNSET, Meta, Struct, UnsetType, convert
from typing_extensions import Annotated

from nextgisweb.env import DBSession
from nextgisweb.lib.apitype import AsJSON, ParamMeta

from nextgisweb.resource import DataScope, resource_factory
from nextgisweb.resource.exception import ResourceInterfaceNotSupported

from ..api import versioning
from ..interface import IFeatureLayer
from ..versioning.exception import FVersioningEpochMismatch, FVersioningEpochRequired
from .exception import TransactionNotCommitted, TransactionNotFound
from .model import FeatureLayerTransaction as Transaction
from .operation import OperationError, OperationExecutor

ERROR_LIMIT = 10

TransactionID = Annotated[int, Meta(description="Transaction ID")]
Started = Annotated[datetime, Meta(description="Start timestamp")]
Commited = Annotated[datetime, Meta(description="Commit timestamp")]

SeqNum = Annotated[
    int,
    Meta(title="SeqNum", ge=0, le=2147483647),
    Meta(
        description="A sequential number of the operation in the transaction. "
        "An API client is responsible for managing these numbers. Any integer "
        "from 0...2147483647 range is OK, and gaps are allowed.",
    ),
]


def txn_factory(request) -> Transaction:
    resource = resource_factory(request)
    request.resource_permission(DataScope.write, resource)

    if not IFeatureLayer.providedBy(resource):
        raise ResourceInterfaceNotSupported

    qtxn = (
        DBSession.query(Transaction)
        .with_for_update()
        .filter_by(
            id=int(request.matchdict["tid"]),
            resource_id=resource.id,
            user_id=request.user.id,
        )
    )

    if result := qtxn.one_or_none():
        return result
    else:
        raise TransactionNotFound


txn_factory.annotations = dict(
    id=[ParamMeta(description="Resource ID to modify by transaction")],
    tid=[ParamMeta(description="Transaction ID")],
)


class TransactionCreateBody(Struct, kw_only=True):
    epoch: Union[int, UnsetType] = UNSET


class TransactionCreatedResponse(Struct, kw_only=True):
    id: TransactionID
    started: Started


def cpost(resource, request, *, body: TransactionCreateBody) -> TransactionCreatedResponse:
    """Start new transaction"""

    request.resource_permission(DataScope.write)

    if resource.fversioning is None:
        pass
    elif body.epoch is UNSET:
        raise FVersioningEpochRequired()
    else:
        FVersioningEpochMismatch.disprove(resource, body.epoch)

    txn = Transaction(
        resource=resource,
        user=request.user,
        epoch=body.epoch if body.epoch is not UNSET else None,
    ).persist()

    DBSession.flush()
    return TransactionCreatedResponse(id=txn.id, started=txn.started)


NullOperation = Annotated[
    None,
    Meta(
        title="NullOperation",
        description="Removes a previously submitted operation with the same " "sequential number.",
    ),
]

InputType = Any
ResultType = Any

if not TYPE_CHECKING:
    InputType = Union[tuple(OperationExecutor.input_types.values()) + (NullOperation,)]
    ResultType = Union[tuple(OperationExecutor.result_types.values())]


def iget(txn: Transaction, request) -> AsJSON[List[Tuple[SeqNum, ResultType]]]:
    """Read transaction results"""

    TransactionNotCommitted.disprove(txn)
    return list(txn.read_results())


class OperationItem(Struct, array_like=True):
    seqnum: SeqNum
    payload: Annotated[InputType, Meta(title="Payload")]


def iput(txn: Transaction, request, *, body: AsJSON[List[OperationItem]]) -> AsJSON[None]:
    """Update transaction operations"""

    for item in body:
        txn.put_operation(item.seqnum, item.payload, UNSET)


def idelete(txn, request) -> AsJSON[None]:
    """Dispose transaction"""

    DBSession.delete(txn)
    return None


ErrorType = Type[Struct]
if not TYPE_CHECKING:
    ErrorType = Union[tuple(OperationError.registry)]


class CommitErrors(Struct, kw_only=True, tag="errors", tag_field="status"):
    """Transaction could not be committed due to errors"""

    errors: List[Tuple[SeqNum, ErrorType]]


class CommitSuccess(Struct, kw_only=True, tag="committed", tag_field="status"):
    """Transaction has been successfully committed"""

    committed: Commited


def ipost(txn: Transaction, request) -> AsJSON[Union[CommitErrors, CommitSuccess]]:
    """Commit transaction"""

    if txn.committed:
        return CommitSuccess(committed=txn.committed)
    elif errors := txn.errors():
        return CommitErrors(errors=errors)

    with versioning(txn.resource, request) as vobj:
        # Set up executors
        executors: Dict[Type[OperationExecutor], OperationExecutor] = dict()
        for action in txn.actions():
            cls = OperationExecutor.executors[action]
            if cls not in executors:
                executors[cls] = cls(txn.resource, vobj=vobj)

        # Check and lock
        operations, errors = list(), list()
        for seqnum, payload, params in txn.operations():
            action = payload["action"]
            executor = executors[OperationExecutor.executors[action]]
            input_type = OperationExecutor.input_types[action]
            operation = convert(payload, input_type)

            try:
                executor.prepare(operation)
            except OperationError as exc:
                error = (seqnum, exc.value)
                txn.write_error(*error)
                errors.append(error)
                if len(errors) >= ERROR_LIMIT:
                    break

            operations.append((seqnum, executor, operation, params))

        if len(errors) > 0:
            return CommitErrors(errors=errors)

        # Apply changes
        for seqnum, executor, operation, params in operations:
            result = executor.execute(operation)
            txn.write_result(seqnum, result)

    txn.committed = datetime.utcnow()
    return CommitSuccess(committed=txn.committed)


def setup_pyramid(comp, config):
    config.add_route(
        "feature_layer.transaction.collection",
        "/api/resource/{id:uint}/feature/transaction/",
        factory=resource_factory,
    ).post(cpost, context=IFeatureLayer)

    config.add_route(
        "feature_layer.transaction.item",
        "/api/resource/{id:uint}/feature/transaction/{tid:uint}",
        factory=txn_factory,
        get=iget,
        put=iput,
        post=ipost,
        delete=idelete,
    )
