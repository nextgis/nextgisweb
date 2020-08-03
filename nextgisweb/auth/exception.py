# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

from ..core.exception import UserException

from .util import _


class InvalidCredentialsException(UserException):
    title = _("Invalid credentials")
    http_status_code = 401


class UserDisabledException(UserException):
    title = _("User is disabled")
    http_status_code = 403
