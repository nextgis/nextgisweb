# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

from ..core.exception import UserException

from .util import _


__all__ = [
    'FeatureNotFound',
]


class FeatureNotFound(UserException):
    title = _("Feature not found")
    message = _("Feature with id = %d was not found in resource with = %d.")
    detail = _("The feature may have been deleted or an error in the address.")
    http_status_code = 404

    def __init__(self, resource_id, feature_id):
        super(FeatureNotFound, self).__init__(
            message=self.__class__.message % (feature_id, resource_id),
            data=dict(resource_id=resource_id, feature_id=feature_id))
