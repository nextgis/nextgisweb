from nextgisweb.env import gettext

from .base import Field, ResourceFavorite, from_route
from .model import ResourceFavoriteModel

from_route("resource.show", gettext("Go to"), icon="material-web_asset")
from_route("resource.update", gettext("Edit"), icon="material-edit")
