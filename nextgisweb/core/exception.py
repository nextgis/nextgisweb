from typing import Any, Callable, Literal, overload

from nextgisweb.env import gettext
from nextgisweb.lib.i18n import TranslatableOrStr

UserExceptionContact = Literal["support", "administrator"]


class UserException(Exception):
    title: TranslatableOrStr
    message: TranslatableOrStr | None
    detail: TranslatableOrStr | None
    contact: UserExceptionContact
    http_status_code: int
    data: dict[str, Any]

    @overload
    def __init__(
        self,
        message: TranslatableOrStr,
        /,
        title: TranslatableOrStr | None = None,
        detail: TranslatableOrStr | None = None,
        contact: UserExceptionContact | None = None,
        http_status_code: int | None = None,
        data: dict[str, Any] | None = None,
    ): ...

    @overload
    def __init__(
        self,
        *,
        title: TranslatableOrStr | None = None,
        message: TranslatableOrStr | None = None,
        detail: TranslatableOrStr | None = None,
        contact: UserExceptionContact | None = None,
        http_status_code: int | None = None,
        data: dict[str, Any] | None = None,
    ): ...

    __defaults: tuple[tuple[str, Callable[[], Any]], ...] = (
        ("title", lambda: None),
        ("message", lambda: None),
        ("detail", lambda: None),
        ("contact", lambda: "support"),
        ("http_status_code", lambda: 500),
        ("data", lambda: dict()),
    )

    def __init__(self, *args, **kwargs):
        if len(args) == 1:
            assert "message" not in kwargs
            kwargs["message"] = args[0]
        else:
            assert len(args) == 0

        for k, df in self.__defaults:
            if k in kwargs and (v := kwargs[k]) is not None:
                setattr(self, k, v)
            elif not hasattr(self, k):
                setattr(self, k, df())

        super().__init__(self.message)


class ValidationError(UserException):
    title = gettext("Validation error")
    http_status_code = 422


class ForbiddenError(UserException):
    title = gettext("Forbidden")
    contact = "administrator"
    http_status_code = 403


class InsufficientPermissions(UserException):
    title = gettext("Insufficient permissions")
    contact = "administrator"
    http_status_code = 403


class OperationalError(UserException):
    title = gettext("Operational error")
    http_status_code = 503


class ExternalServiceError(OperationalError):
    title = gettext("External service error")


class NotConfigured(UserException):
    """Not configured exception base class

    Should be used as a base class for exceptions that are raised when a
    specific server configuration is required but not present."""

    title = gettext("Not configured")
    http_status_code = 501
