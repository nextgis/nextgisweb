from nextgisweb.env import gettext

from .base import Field, ResourceFavorite
from .model import ResourceFavoriteModel


class ResourceShowFavorite(ResourceFavorite):
    kind = "show"
    route = "resource.show"
    label = gettext("Go to")
    icon = "material-web_asset"
