from nextgisweb.env import gettext

from nextgisweb.core.exception import UserException, ValidationError


class TransactionNotFound(UserException):
    title = gettext("Transaction not found")
    http_status_code = 404


class TransactionOperationConflict(UserException):
    title = gettext("Operation conflict in transaction")
    http_status_code = 409

    def __init__(self, seqnum):
        super().__init__(data=dict(seqnum=seqnum))


class TransactionNotCommitted(ValidationError):
    title = gettext("Transaction not committed")

    @classmethod
    def disprove(cls, transaction):
        if not transaction.committed:
            raise TransactionNotCommitted
