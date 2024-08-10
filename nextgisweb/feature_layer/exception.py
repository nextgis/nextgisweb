from nextgisweb.env import gettext, gettextf

from nextgisweb.core.exception import UserException


class FeatureNotFound(UserException):
    title = gettext("Feature not found")
    message = gettext("Feature with id = %d was not found in resource with id = %d.")
    detail = gettext("The feature may have been deleted or an error in the address.")
    http_status_code = 404

    def __init__(self, resource_id, feature_id):
        super().__init__(
            message=self.__class__.message % (feature_id, resource_id),
            data=dict(resource_id=resource_id, feature_id=feature_id),
        )


class RestoreNotDeleted(UserException):
    title = gettext("Feature not deleted")
    message_tpl = gettextf("Unable to restore the #{} feature as it is not deleted.")
    http_status_code = 422

    def __init__(self, resource_id, feature_id):
        super().__init__(
            message=self.message_tpl(feature_id),
            data=dict(resource_id=resource_id, feature_id=feature_id),
        )
