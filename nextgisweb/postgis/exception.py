from psycopg import errors as pg_errors
from sqlalchemy.exc import StatementError

from nextgisweb.env import gettext, gettextf

from nextgisweb.core.exception import ExternalServiceError


class ExternalDatabaseError(ExternalServiceError):
    title = gettext("External database error")
    message = gettext("An error occurred while accessing the external database.")

    _detail_sqlstate = gettextf(
        "PostgreSQL error code: {}. An explanation of the error code can be found here: "
        "https://www.postgresql.org/docs/current/errcodes-appendix.html. Additional details may "
        "be available in the external database logs."
    )

    def __init__(self, *args, sa_error=None, **kwargs):
        super().__init__(*args, **kwargs)

        if sa_error is not None:
            if (
                isinstance(sa_error, StatementError)
                and (dbapi_error := sa_error.orig) is not None
                and (dbapi_diag := dbapi_error.diag) is not None
            ):
                sqlstate = dbapi_diag.sqlstate
                try:
                    name = pg_errors.lookup(sqlstate).__name__ if sqlstate else None
                except KeyError:
                    name = None

                self.detail = self._detail_sqlstate(f"{sqlstate} ({name})" if name else sqlstate)
            else:
                self.detail = "SQLAlchemy error code: %s." % sa_error.code
