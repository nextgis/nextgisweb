from ..core.exception import UserException

from .util import _


class InvalidAuthorizationHeader(UserException):
    title = _("Invalid authorization header")
    http_status_code = 400


class InvalidCredentialsException(UserException):
    title = _("Invalid credentials")
    http_status_code = 401


class UserDisabledException(UserException):
    title = _("User is disabled")
    http_status_code = 403
