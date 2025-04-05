from nextgisweb.env import gettext

from nextgisweb.core.exception import UserException


class MalformedJSONBody(UserException):
    title = gettext("Malformed JSON body")
    message = gettext("The JSON body of the request is malformed or invalid.")
    http_status_code = 400
