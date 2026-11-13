import sqlalchemy as sa

from nextgisweb.env import DBSession

from nextgisweb.feature_attachment.model import FeatureAttachment
from nextgisweb.feature_layer import FeatureLayerMixin
from nextgisweb.jsrealm import jsentry
from nextgisweb.resource import DataScope

from .base import WebmapLayerPlugin

IMAGE_MIME_TYPES = ("image/jpeg", "image/png")


class LayerPhotoPlugin(WebmapLayerPlugin):
    entry = jsentry("@nextgisweb/webmap/plugin/layer-photo")

    @classmethod
    def get_payload(cls, *, layer, user, **kwargs):
        if not isinstance(layer, FeatureLayerMixin):
            return None
        if not layer.has_permission(DataScope.read, user):
            return None

        has_photos = DBSession.scalar(
            sa.select(
                sa.exists().where(
                    FeatureAttachment.resource_id == layer.id,
                    FeatureAttachment.mime_type.in_(IMAGE_MIME_TYPES),
                )
            )
        )
        return dict(has_photos=bool(has_photos))
