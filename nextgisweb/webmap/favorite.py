from nextgisweb.env import gettext

from nextgisweb.jsrealm import icon
from nextgisweb.pyramid.tomb import Request
from nextgisweb.resource.favorite import Field, ResourceFavorite, from_route

from_route("webmap.display", gettext("Display"), icon=icon("display"))


class WebMapFragmentFavorite(ResourceFavorite):
    kind = "fragment"
    label = gettext("Fragment")
    icon = icon("material/crop_free")

    query_string: Field[str]

    @classmethod
    def url(cls, instance, *, request: Request):
        base = request.route_url("webmap.display", id=instance.resource_id)
        return base + "?" + instance.data["query_string"]
