from nextgisweb.env import gettext

from nextgisweb.jsrealm import icon
from nextgisweb.resource.favorite import from_route

from_route("layer_preview.map", gettext("Preview"), icon=icon("material/preview"))
