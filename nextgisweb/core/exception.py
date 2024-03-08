from typing import Any, Dict, NamedTuple, Optional, Union, overload

from zope.interface import Attribute, Interface, classImplements, implementer
from zope.interface.interface import adapter_hooks

from nextgisweb.env import gettext
from nextgisweb.lib.i18n import TranslatableOrStr


class IUserException(Interface):
    title = Attribute("General error description")
    message = Attribute("User friendly and secure message describing error")
    detail = Attribute("Information about fixing problem in Web GIS context")
    data = Attribute("Error specific JSON-serializable dictionary")
    http_status_code = Attribute("Corresponding HTTP 4xx or 5xx status code")


class UserExceptionObject(NamedTuple):
    title: TranslatableOrStr
    message: Union[TranslatableOrStr, None]
    detail: Union[TranslatableOrStr, None]
    data: Dict[str, Any]
    http_status_code: Optional[int]


classImplements(UserExceptionObject, IUserException)


def user_exception(
    exc,
    *,
    title: TranslatableOrStr,
    message: Union[TranslatableOrStr, None] = None,
    detail: Union[TranslatableOrStr, None] = None,
    data: Union[Dict[str, Any], None] = None,
    http_status_code: Union[int, None] = None,
):
    exc.__user_exception__ = UserExceptionObject(
        title=title,
        message=message,
        detail=detail,
        data=data if data else dict(),
        http_status_code=http_status_code,
    )


@adapter_hooks.append
def adapt_exception_to_user_exception(iface, obj):
    if isinstance(obj, Exception) and issubclass(iface, IUserException):
        if ue := getattr(obj, "__user_exception__", None):
            return ue


@implementer(IUserException)
class UserException(Exception):
    title: TranslatableOrStr
    message: Union[TranslatableOrStr, None]
    detail: Union[TranslatableOrStr, None]
    data: Dict[str, Any]
    http_status_code: Optional[int]

    @overload
    def __init__(
        self,
        message: TranslatableOrStr,
        /,
        title: Union[TranslatableOrStr, None] = None,
        detail: Union[TranslatableOrStr, None] = None,
        data: Union[Dict[str, Any], None] = None,
        http_status_code: Union[int, None] = None,
    ):
        ...

    @overload
    def __init__(
        self,
        *,
        title: Union[TranslatableOrStr, None] = None,
        message: Union[TranslatableOrStr, None] = None,
        detail: Union[TranslatableOrStr, None] = None,
        data: Union[Dict[str, Any], None] = None,
        http_status_code: Union[int, None] = None,
    ):
        ...

    def __init__(self, *args, **kwargs):
        if len(args) == 1:
            assert "message" not in kwargs
            kwargs["message"] = args[0]
        else:
            assert len(args) == 0

        attrs = ("title", "message", "detail", "data", "http_status_code")
        numkw = 0
        for k in attrs:
            if k in kwargs:
                numkw += 1
                if (v := kwargs[k]) is not None or not hasattr(self, k):
                    if k == "data" and v is None:
                        v = dict()
                    setattr(self, k, v)
            elif not hasattr(self, k):
                if k == "data":
                    v = dict()
                else:
                    v = None
                setattr(self, k, v)

        assert numkw == len(kwargs)

    def __str__(self):
        return "{}: {}".format(self.__class__.__name__, self.message)


class ValidationError(UserException):
    title = gettext("Validation error")
    http_status_code = 422


class ForbiddenError(UserException):
    title = gettext("Forbidden")
    http_status_code = 403


class InsufficientPermissions(UserException):
    title = gettext("Insufficient permissions")
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
