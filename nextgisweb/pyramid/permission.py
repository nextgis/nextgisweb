from nextgisweb.env import gettext

from nextgisweb.auth import Permission

_msg_cors = gettext("Cross-origin resource sharing (CORS)")
cors_view = Permission("cors.view", _msg_cors, "view")
cors_manage = Permission("cors.manage", _msg_cors, "manage")
cors = (cors_view, cors_manage)
