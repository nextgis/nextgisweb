from nextgisweb.jsrealm import jsentry
from nextgisweb.resource import ResourceScope

from .base import WebmapGroupPlugin


class GroupPropertiesPlugin(WebmapGroupPlugin):
    entry = jsentry("@nextgisweb/webmap/plugin/group-properties")

    @classmethod
    def get_payload(cls, *, webmap, user, **kwargs):
        if webmap.has_permission(ResourceScope.update, user):
            return dict()
