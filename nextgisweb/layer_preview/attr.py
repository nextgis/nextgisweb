from nextgisweb.basemap import BasemapLayer
from nextgisweb.feature_layer import IFeatureLayer
from nextgisweb.raster_layer import RasterLayer
from nextgisweb.render import IRenderableStyle
from nextgisweb.resource import DataScope, Resource
from nextgisweb.resource.attr import ResourceAttr, ResourceAttrContext


class LayerPreviewAttrAvailable(ResourceAttr, tag="layer_preview.available"):
    def __call__(self, obj: Resource, ctx: ResourceAttrContext) -> bool:
        return bool(
            (
                IFeatureLayer.providedBy(obj)
                or IRenderableStyle.providedBy(obj)
                or (isinstance(obj, RasterLayer) and obj.cog)
                or (isinstance(obj, BasemapLayer))
            )
            and (obj.has_permission(DataScope.read, ctx.user))
        )
