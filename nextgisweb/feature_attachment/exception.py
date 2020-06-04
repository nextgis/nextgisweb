# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

from ..core.exception import UserException

from .util import _


__all__ = [
    'AttachmentNotFound',
]


class AttachmentNotFound(UserException):
    title = _("Attachment not found")
    message = _("Attachment with id = %d was not found in feature with id = %d.")
    detail = _("The attachment may have been deleted or an error in the address.")
    http_status_code = 404

    def __init__(self, resource_id, feature_id, attachment_id):
        super(AttachmentNotFound, self).__init__(
            message=self.__class__.message % (attachment_id, feature_id),
            data=dict(resource_id=resource_id, feature_id=feature_id, attachment_id=attachment_id))