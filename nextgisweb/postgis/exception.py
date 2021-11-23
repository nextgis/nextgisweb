from sqlalchemy.exc import StatementError

from ..core.exception import ExternalServiceError
from .util import _


class ExternalDatabaseError(ExternalServiceError):
    title = _("External database error")

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        if not hasattr(self, 'detail') and 'sa_error' in kwargs:
            sa_error = kwargs['sa_error']
            if isinstance(sa_error, StatementError) and sa_error.orig is not None:
                detail = 'PostgreSQL error code: %s.' % sa_error.orig.pgcode
            else:
                detail = 'SQLAlchemy error code: %s.' % sa_error.code
            setattr(self, 'detail', detail)
