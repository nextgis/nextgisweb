from nextgisweb.env import gettext

from nextgisweb.core.exception import UserException


class InvalidAuthorizationHeader(UserException):
    title = gettext("Invalid authorization header")
    http_status_code = 400


class InvalidCredentialsException(UserException):
    title = gettext("Invalid credentials")
    http_status_code = 401


class UserDisabledException(UserException):
    title = gettext("User is disabled")
    http_status_code = 401


class SessionAuthenticationRequired(UserException):
    title = gettext("Session authentication required")
    http_status_code = 422


class ALinkException(UserException):
    title = gettext("Invalid authorization link")
    http_status_code = 401
