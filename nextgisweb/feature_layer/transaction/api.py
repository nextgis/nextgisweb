from datetime import datetime
from typing import TYPE_CHECKING, Annotated, Any, Union

from msgspec import UNSET, Meta, Struct, UnsetType, convert

from nextgisweb.env import DBSession
from nextgisweb.lib.apitype import AsJSON
from nextgisweb.lib.datetime import utcnow_naive

from nextgisweb.pyramid.tomb import Request
from nextgisweb.resource import DataScope, ResourceFactory
from nextgisweb.resource.exception import ResourceInterfaceNotSupported

from ..component import FeatureLayerComponent
from ..interface import IFeatureLayer
from ..versioning.exception import FVersioningEpochMismatch, FVersioningEpochRequired
from .exception import TransactionNotCommitted, TransactionNotFound
from .model import FeatureLayerTransaction as Transaction
from .operation import OperationError, OperationExecutor, SeqNum

ERROR_LIMIT = 10

TransactionID = Annotated[int, Meta(description="Transaction ID")]
Started = Annotated[datetime, Meta(description="Start timestamp", tz=False)]
Commited = Annotated[datetime, Meta(description="Commit timestamp", tz=False)]


class TransactionFactory(ResourceFactory):
    def __init__(self):
        super().__init__(context=IFeatureLayer)

    def __call__(self, request: Request) -> Transaction:
        resource = super().__call__(request)
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

        if txn := qtxn.one_or_none():
            return txn
        else:
            raise TransactionNotFound

    @property
    def annotations(self):
        return dict(super().annotations, tid=Annotated[int, Meta(description="Transaction ID")])


class TransactionCreateBody(Struct, kw_only=True):
    epoch: int | UnsetType = UNSET


class TransactionCreatedResponse(Struct, kw_only=True):
    id: TransactionID
    started: Started


def cpost(
    resource,
    request: Request,
    *,
    body: TransactionCreateBody,
) -> TransactionCreatedResponse:
    """Start new transaction

    :returns: New transaction details including the transaction ID"""

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
        description="Removes previously submitted operation",
    ),
]

InputType = Any
ResultType = Any

if not TYPE_CHECKING:
    InputType = Union[tuple(OperationExecutor.input_types.values()) + (NullOperation,)]
    ResultType = Union[tuple(OperationExecutor.result_types.values())]


def iget(txn: Transaction, request: Request) -> AsJSON[list[tuple[SeqNum, ResultType]]]:
    """Read transaction results

    :returns: Transaction results and status"""

    TransactionNotCommitted.disprove(txn)
    return list(txn.read_results())


OperationItem = tuple[SeqNum, Annotated[InputType, Meta(title="Payload")]]


def iput(txn: Transaction, request: Request, *, body: AsJSON[list[OperationItem]]) -> AsJSON[None]:
    """Update transaction operations

    The API client is responsible for managing operation sequential numbers. Any
    integer from the 0...2147483647 range is OK, and gaps are allowed.

    :returns: Updated transaction state"""

    for item in body:
        txn.put_operation(*item, UNSET)


def idelete(txn, request: Request) -> AsJSON[None]:
    """Dispose transaction

    :returns: Transaction disposed successfully"""

    DBSession.delete(txn)
    return None


ErrorType = type[Struct]
if not TYPE_CHECKING:
    ErrorType = Union[tuple(OperationError.registry)]


class CommitErrors(Struct, kw_only=True, tag="errors", tag_field="status"):
    """Transaction could not be committed due to errors"""

    errors: list[tuple[SeqNum, ErrorType]]


class CommitSuccess(Struct, kw_only=True, tag="committed", tag_field="status"):
    """Transaction has been successfully committed"""

    committed: Commited


def ipost(txn: Transaction, request: Request) -> AsJSON[CommitErrors | CommitSuccess]:
    """Commit transaction

    :returns: Committed transaction results"""

    if txn.committed:
        return CommitSuccess(committed=txn.committed)
    elif errors := txn.errors():
        return CommitErrors(errors=errors)

    with txn.resource.feature_transaction(request) as ftxn:
        # Set up executors
        executors = dict[type[OperationExecutor], OperationExecutor]()
        for action in txn.actions():
            cls = OperationExecutor.executors[action]
            if cls not in executors:
                executors[cls] = cls(txn=txn, vobj=ftxn.vobj)

        # Check and lock
        operations, errors = list(), list()
        for seqnum, payload, params in txn.operations():
            action = payload["action"]
            executor = executors[OperationExecutor.executors[action]]
            input_type = OperationExecutor.input_types[action]
            operation = convert(payload, input_type)

            try:
                executor.prepare(seqnum, operation)
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
            result = executor.execute(seqnum, operation)
            txn.write_result(seqnum, result)

    txn.committed = utcnow_naive()
    return CommitSuccess(committed=txn.committed)


def setup_pyramid(comp: FeatureLayerComponent, config):
    config.add_route(
        "feature_layer.transaction.collection",
        "/api/resource/{id}/feature/transaction/",
        factory=ResourceFactory(context=IFeatureLayer),
        post=cpost,
    )

    config.add_route(
        "feature_layer.transaction.item",
        "/api/resource/{id}/feature/transaction/{tid}",
        factory=TransactionFactory(),
        get=iget,
        put=iput,
        post=ipost,
        delete=idelete,
    )
