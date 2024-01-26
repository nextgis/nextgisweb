from nextgisweb.env import gettext

from nextgisweb.core.exception import UserException


class SRSCatalogNotConfigured(UserException):
    title = gettext("SRS catalog not cofigured")
    http_status_code = 422
