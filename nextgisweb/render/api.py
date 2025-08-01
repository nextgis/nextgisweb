from io import BytesIO
from itertools import product
from math import ceil, floor
from pathlib import Path
from typing import Annotated, Dict, List, Literal, Union

from msgspec import UNSET, Meta, Struct, UnsetType
from PIL import Image, ImageDraw, ImageFont
from pyramid.httpexceptions import HTTPBadRequest
from pyramid.response import Response

from nextgisweb.env import gettext
from nextgisweb.lib.apitype import AnyOf, AsJSON, ContentType, StatusCode

from nextgisweb.core.exception import UserException, ValidationError
from nextgisweb.resource import DataScope, Resource, ResourceFactory, ResourceNotFound, ResourceRef
from nextgisweb.resource.api import ResourceID
from nextgisweb.spatial_ref_sys import SRS
from nextgisweb.spatial_ref_sys.api import SRSID

from .imgcodec import COMPRESSION_FAST, FORMAT_PNG, image_encoder_factory
from .interface import ILegendableStyle, IRenderableStyle
from .legend import ILegendSymbols
from .util import TILE_SIZE, af_transform, image_zoom

RenderResource = Annotated[
    List[int],
    Meta(
        min_length=1,
        description="Resources to render",
    ),
]

TileZ = Annotated[int, Meta(ge=0, le=24, description="Tile zoom level")]
TileX = Annotated[int, Meta(ge=0, description="Tile X coordinate")]
TileY = Annotated[int, Meta(ge=0, description="Tile Y coordinate")]

# NOTE: Use lists instead of tuples as Swagger UI doesn't (Redoc does) support
# arrays containing different types of values.
RenderExtent = Annotated[
    List[float],
    Meta(min_length=4, max_length=4),
    Meta(description="Rendering extent"),
]
ImageSize = Annotated[
    List[Annotated[int, Meta(ge=1, le=8192)]],
    Meta(min_length=2, max_length=2),
    Meta(description="Image size in pixels"),
]

SymbolRange = Annotated[str, Meta(pattern=r"^[0-9]{1,3}(-[0-9]{1,3})?$")]
Symbols = Annotated[
    Dict[int, Annotated[List[SymbolRange], Meta(min_length=1)]],
    Meta(examples=[dict()]),  # Just to stop Swagger UI make crazy defaults
]

NoDataStatusCode = Annotated[
    Literal[200, 204, 404],
    Meta(description="HTTP status code for empty images"),
]
TileCache = Annotated[bool, Meta(description="Use tile cache if available")]
TileDebugInfo = Annotated[bool, Meta(description="Draw tile debug info")]

RenderResponse = AnyOf[
    Annotated[Response, ContentType("image/png")],
    Annotated[Response, StatusCode(204)],
    Annotated[Response, StatusCode(404), ContentType("application/octet-stream")],
]


class InvalidOriginError(UserException):
    title = gettext("Invalid origin")
    message = gettext(
        "Origin validation is enabled for rendering requests, but the given "
        "origin doesn't match with the CORS origins list."
    )
    http_status_code = 403


with open(Path(__file__).parent / "empty_256x256.png", "rb") as f:
    EMPTY_TILE_256x256 = f.read()


def rtoint(arg):
    return tuple(round(c) for c in arg)


def tile_debug_info(img, offset=(0, 0), color="black", zxy=None, extent=None, msg=None):
    """Print tile debug info on image at given tile offset"""
    drw = ImageDraw.Draw(img)
    drw.rectangle(offset + tuple(map(lambda c: c + 255, offset)), outline=color)
    ImageFont.load_default()
    text = []
    if zxy:
        text.append(str(zxy))
    if extent:
        text.append(str(extent[0:2]))
        text.append(str(extent[2:4]))
    if msg:
        text.append(msg)
    drw.text((8 + offset[0], 8 + offset[1]), "\n".join(text), fill=color)
    return img


image_encoder = image_encoder_factory(FORMAT_PNG, COMPRESSION_FAST)


def image_response(img, empty_code, size):
    if img is None:
        if empty_code == 204:
            return Response(None, status=204, content_type=None)
        elif empty_code == 404:
            return Response(b"", status=404, content_type="application/octet-stream")
        elif size == (TILE_SIZE, TILE_SIZE):
            return Response(EMPTY_TILE_256x256, content_type="image/png")
        else:
            img = Image.new("RGBA", size)

    buf = BytesIO()
    image_encoder(img, buf)
    buf.seek(0)

    return Response(body_file=buf, content_type="image/png")


def check_origin(request):
    if request.env.render.options["check_origin"]:
        origin = request.headers.get("Origin")
        if (
            origin is not None
            and not origin.startswith(request.application_url)
            and not request.check_origin(origin)
        ):
            raise InvalidOriginError()


def process_symbols(value: Symbols) -> Dict[int, List[int]]:
    result = dict()
    for k, s in value.items():
        result[k] = seq = list()
        tail = -1
        for v in s:
            p = tuple(int(i) for i in v.split("-", maxsplit=1))
            f, t = p if len(p) == 2 else (p[0], p[0])
            if f <= tail:
                raise ValidationError(gettext("Invalid symbols sequence"))
            seq.extend(range(f, t + 1))
            tail = t
    return result


def tile(
    request,
    *,
    resource: RenderResource,
    z: TileZ,
    x: TileX,
    y: TileY,
    symbols: Symbols,
    nd: NoDataStatusCode = 200,
    cache: TileCache = True,
) -> RenderResponse:
    """Render tile from one or more resources"""
    check_origin(request)

    p_symbols = process_symbols(symbols) if symbols else dict()
    p_cache = cache and request.env.render.tile_cache_enabled
    srs_obj = SRS.filter_by(id=3857).one()

    aimg = None
    for resid in resource:
        obj = Resource.filter_by(id=resid).one_or_none()

        if obj is None:
            raise ResourceNotFound(resid)

        if not IRenderableStyle.providedBy(obj):
            raise ValidationError("Resource (ID=%d) cannot be rendered." % (resid,))

        request.resource_permission(DataScope.read, obj)

        rimg = None  # Resulting resource image

        rsymbols = p_symbols.get(resid)
        tcache = obj.tile_cache

        # Is requested tile may be cached?
        cache_enabled = (
            p_cache
            and rsymbols is None
            and tcache is not None
            and tcache.enabled
            and (tcache.max_z is None or z <= tcache.max_z)
        )

        cache_exists = False
        if cache_enabled:
            cache_exists, rimg = tcache.get_tile((z, x, y))

        if not cache_exists:
            cond = dict()
            if rsymbols is not None:
                cond["symbols"] = rsymbols
            req = obj.render_request(srs_obj, cond=cond)
            rimg = req.render_tile((z, x, y), TILE_SIZE)

            if cache_enabled:
                tcache.put_tile((z, x, y), rimg)

        if rimg is None:
            continue

        if aimg is None:
            aimg = rimg
        else:
            try:
                aimg = Image.alpha_composite(aimg, rimg)
            except ValueError:
                raise HTTPBadRequest(
                    explanation="Image (ID=%d) must have mode %s, but it is %s mode."
                    % (obj.id, aimg.mode, rimg.mode)
                )

    return image_response(aimg, nd, (TILE_SIZE, TILE_SIZE))


def image(
    request,
    *,
    resource: RenderResource,
    srs: SRSID = 3857,
    extent: RenderExtent,
    size: ImageSize,
    symbols: Symbols,
    nd: NoDataStatusCode = 200,
    cache: TileCache = True,
    tdi: TileDebugInfo = False,
) -> RenderResponse:
    """Render image from one or more resources"""
    check_origin(request)

    p_symbols = process_symbols(symbols) if symbols else dict()
    p_cache = cache and request.env.render.tile_cache_enabled
    srs_obj = SRS.filter_by(id=srs).one()
    if p_cache:
        cache_zoom = image_zoom(extent, size, srs_obj)
        if cache_zoom is not None:
            # Affine transform from layer to tile
            at_l2t = af_transform(
                (srs_obj.minx, srs_obj.miny, srs_obj.maxx, srs_obj.maxy),
                (0, 0, 2**cache_zoom, 2**cache_zoom),
            )
            at_t2l = ~at_l2t

            # Affine transform from layer to image
            at_l2i = af_transform(extent, (0, 0) + tuple(size))

            # Affine transform from tile to image
            at_t2i = at_l2i * ~at_l2t

            # Tile coordinates of render extent
            t_lb = tuple(at_l2t * extent[0:2])
            t_rt = tuple(at_l2t * extent[2:4])

            tb = (
                floor(t_lb[0]) if t_lb[0] == min(t_lb[0], t_rt[0]) else ceil(t_lb[0]),
                floor(t_lb[1]) if t_lb[1] == min(t_lb[1], t_rt[1]) else ceil(t_lb[1]),
                floor(t_rt[0]) if t_rt[0] == min(t_lb[0], t_rt[0]) else ceil(t_rt[0]),
                floor(t_rt[1]) if t_rt[1] == min(t_lb[1], t_rt[1]) else ceil(t_rt[1]),
            )

            cache_ext_extent = at_t2l * tb[0:2] + at_t2l * tb[2:4]
            ext_im = rtoint(at_t2i * tb[0:2] + at_t2i * tb[2:4])
            cache_ext_size = (ext_im[2] - ext_im[0], ext_im[1] - ext_im[3])
            cache_ext_offset = (-ext_im[0], -ext_im[3])

            tx_range = tuple(range(min(tb[0], tb[2]), max(tb[0], tb[2])))
            ty_range = tuple(range(min(tb[1], tb[3]), max(tb[1], tb[3])))

    aimg = None
    for resid in resource:
        obj = Resource.filter_by(id=resid).one_or_none()

        if obj is None:
            raise ResourceNotFound(resid)

        if not IRenderableStyle.providedBy(obj):
            raise ValidationError("Resource (ID=%d) cannot be rendered." % (resid,))

        request.resource_permission(DataScope.read, obj)

        rimg = None

        rsymbols = p_symbols.get(resid)
        tcache = obj.tile_cache

        # Is requested image may be cached via tiles?
        cache_enabled = (
            p_cache
            and cache_zoom is not None
            and rsymbols is None
            and tcache is not None
            and tcache.enabled
            and tcache.image_compose
            and (tcache.max_z is None or cache_zoom <= tcache.max_z)
        )

        if cache_enabled:
            for tx, ty in product(tx_range, ty_range):
                zxy = (cache_zoom, tx, ty)

                cache_exists, timg = tcache.get_tile(zxy)
                if not cache_exists:
                    rimg = None
                    break
                else:
                    if rimg is None:
                        rimg = Image.new("RGBA", size)

                    if tdi:
                        msg = "CACHED"
                        if timg is None:
                            timg = Image.new("RGBA", size)
                            msg += " EMPTY"
                        timg = tile_debug_info(
                            timg.convert("RGBA"),
                            color="blue",
                            zxy=zxy,
                            extent=at_t2l * (tx, ty) + at_t2l * (tx + 1, ty + 1),
                            msg=msg,
                        )

                    if timg is None:
                        continue

                    toffset = rtoint(at_t2i * (tx, ty))
                    rimg.paste(timg, toffset)

        if rimg is None:
            cond = dict()
            if rsymbols is not None:
                cond["symbols"] = rsymbols
            req = obj.render_request(srs_obj, cond=cond)

            if cache_enabled:
                ext_extent = cache_ext_extent
                ext_size = cache_ext_size
                ext_offset = cache_ext_offset
            else:
                ext_extent = extent
                ext_size = size
                ext_offset = (0, 0)

            rimg = req.render_extent(ext_extent, ext_size)

            empty_image = rimg is None

            if cache_enabled:
                tile_cache_failed = False
                for tx, ty in product(tx_range, ty_range):
                    zxy = (cache_zoom, tx, ty)

                    t_offset = at_t2i * (tx, ty)
                    t_offset = rtoint((t_offset[0] + ext_offset[0], t_offset[1] + ext_offset[1]))
                    if empty_image:
                        timg = None
                    else:
                        timg = rimg.crop(
                            t_offset + (t_offset[0] + TILE_SIZE, t_offset[1] + TILE_SIZE)
                        )

                    tile_cache_failed = tile_cache_failed or (
                        not obj.tile_cache.put_tile(zxy, timg)
                    )

                    if tdi:
                        if rimg is None:
                            rimg = Image.new("RGBA", ext_size)
                        msg = "NEW"
                        if empty_image:
                            msg += " EMPTY"
                        rimg = tile_debug_info(
                            rimg,
                            offset=t_offset,
                            color="red",
                            zxy=zxy,
                            extent=at_t2l * (tx, ty) + at_t2l * (tx + 1, ty + 1),
                            msg=msg,
                        )

                    elif tile_cache_failed:
                        # Stop putting to the tile cache in case of its failure.
                        break

            if rimg is None:
                continue

            rimg = rimg.crop(
                (
                    ext_offset[0],
                    ext_offset[1],
                    ext_offset[0] + size[0],
                    ext_offset[1] + size[1],
                )
            )

        if aimg is None:
            aimg = rimg
        else:
            try:
                aimg = Image.alpha_composite(aimg, rimg)
            except ValueError:
                raise HTTPBadRequest(
                    explanation="Image (ID=%d) must have mode %s, but it is %s mode."
                    % (obj.id, aimg.mode, rimg.mode)
                )

    return image_response(aimg, nd, size)


def legend(request) -> Annotated[Response, ContentType("image/png")]:
    """Get resource legend image"""
    request.resource_permission(DataScope.read)
    result = request.context.render_legend()
    return Response(body_file=result, content_type="image/png")


ResourceLegendSymbolsResources = Annotated[
    List[ResourceID],
    Meta(
        min_length=1,
        description="Resource IDs for getting legend symbols",
    ),
]

ResourceLegendSymbolsIconSize = Annotated[
    int,
    Meta(ge=8, le=64),
    Meta(description="Legend symbol size in pixels"),
]


class LegendIcon(Struct, kw_only=True):
    format: Literal["png"]
    data: bytes

    @classmethod
    def from_image(cls, image):
        buf = BytesIO()
        image.save(buf, "png", compress_level=3)
        return cls(format="png", data=buf.getvalue())


class LegendSymbol(Struct, kw_only=True):
    index: int
    render: Union[bool, None]
    display_name: str
    icon: LegendIcon

    @classmethod
    def from_resource(cls, resource, *, icon_size, translate):
        return [
            cls(
                index=item.index,
                render=item.render,
                display_name=translate(item.display_name),
                icon=LegendIcon.from_image(item.icon),
            )
            for item in resource.legend_symbols(icon_size)
        ]


class ResourceLegendSymbolsItem(Struct, kw_only=True):
    resource: ResourceRef
    legend_symbols: Annotated[
        Union[List[LegendSymbol], UnsetType],
        Meta(description="Resource legend symbols if available"),
    ] = UNSET


class ResourceLegendSymbolsResponse(Struct, kw_only=True):
    items: List[ResourceLegendSymbolsItem]


def legend_symbols(
    request, *, icon_size: ResourceLegendSymbolsIconSize = 24
) -> AsJSON[List[LegendSymbol]]:
    """Get resource legend symbols"""
    request.resource_permission(DataScope.read)

    return LegendSymbol.from_resource(
        request.context,
        icon_size=icon_size,
        translate=request.translate,
    )


def resource_legend_symbols(
    request,
    *,
    resources: ResourceLegendSymbolsResources,
    icon_size: ResourceLegendSymbolsIconSize = 24,
) -> ResourceLegendSymbolsResponse:
    """Get legend symbols of multiple resources"""

    resources = list(set(resources))
    query = Resource.filter(Resource.id.in_(resources)).all()
    if len(query) != len(resources):
        missing_ids = set(resources) - set(obj.id for obj in query)
        missing = ", ".join(str(i) for i in missing_ids)
        raise ValidationError("Resources not found: {}!".format(missing))

    items: List[ResourceLegendSymbolsItem] = []
    for res in query:
        request.resource_permission(DataScope.read, res)

        if not ILegendSymbols.providedBy(res):
            legend_symbols = UNSET
        else:
            legend_symbols = LegendSymbol.from_resource(
                res,
                icon_size=icon_size,
                translate=request.translate,
            )

        items.append(
            ResourceLegendSymbolsItem(
                resource=ResourceRef(id=res.id),
                legend_symbols=legend_symbols,
            )
        )

    return ResourceLegendSymbolsResponse(items=items)


def setup_pyramid(comp, config):
    config.add_route(
        "render.tile",
        "/api/component/render/tile",
        get=tile,
    )

    config.add_route(
        "render.image",
        "/api/component/render/image",
    ).get(image, http_cache=0)

    config.add_route(
        "render.legend",
        "/api/resource/{id}/legend",
        factory=ResourceFactory(context=ILegendableStyle),
        get=legend,
    )

    config.add_route(
        "render.resource_legend_symbols",
        "/api/component/render/legend_symbols",
        get=resource_legend_symbols,
    )

    config.add_route(
        "render.legend_symbols",
        "/api/resource/{id}/legend_symbols",
        factory=ResourceFactory(context=ILegendSymbols),
        get=legend_symbols,
        deprecated=True,
    )
