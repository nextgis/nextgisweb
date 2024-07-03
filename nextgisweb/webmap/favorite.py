from nextgisweb.env import gettext

from nextgisweb.resource.favorite import Field, ResourceFavorite


class WebMapDisplayFavorite(ResourceFavorite):
    kind = "display"
    route = "webmap.display"
    label = gettext("Display")
    icon = "webmap-display"


class WebMapFragmentFavorite(ResourceFavorite):
    kind = "fragment"
    label = gettext("Fragment")
    icon = "material-select"

    query_string: Field[str]

    @classmethod
    def url(cls, instance, *, request):
        base = request.route_url("webmap.display", id=instance.resource_id)
        return base + "?" + instance.data["query_string"]
