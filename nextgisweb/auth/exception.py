from nextgisweb.env import _

from nextgisweb.core.exception import UserException


class InvalidAuthorizationHeader(UserException):
    title = _("Invalid authorization header")
    http_status_code = 400


class InvalidCredentialsException(UserException):
    title = _("Invalid credentials")
    http_status_code = 401


class UserDisabledException(UserException):
    title = _("User is disabled")
    http_status_code = 401


class ALinkException(UserException):
    title = _("Invalid authorization link")
    http_status_code = 401
