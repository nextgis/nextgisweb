from nextgisweb.env import _

from nextgisweb.core.exception import UserException


class FeatureNotFound(UserException):
    title = _("Feature not found")
    message = _("Feature with id = %d was not found in resource with id = %d.")
    detail = _("The feature may have been deleted or an error in the address.")
    http_status_code = 404

    def __init__(self, resource_id, feature_id):
        super().__init__(
            message=self.__class__.message % (feature_id, resource_id),
            data=dict(resource_id=resource_id, feature_id=feature_id),
        )
