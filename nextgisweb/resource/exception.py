# -*- coding: utf-8 -*-
from __future__ import unicode_literals


class ResourceError(Exception):
    pass


class Forbidden(ResourceError):
    pass


class ValidationError(ResourceError):
    pass
