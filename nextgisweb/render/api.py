from datetime import datetime
from io import BytesIO
from itertools import product
from math import ceil, floor, log
from pathlib import Path
from typing import List, Literal

from msgspec import Meta, Struct
from PIL import Image, ImageDraw, ImageFont
from pyramid.httpexceptions import HTTPBadRequest
from pyramid.response import Response
from typing_extensions import Annotated

from nextgisweb.env import _
from nextgisweb.lib.apitype import AnyOf, AsJSON, ContentType, EmptyObject, StatusCode

from nextgisweb.core.exception import UserException, ValidationError
from nextgisweb.resource import DataScope, Resource, ResourceFactory, ResourceNotFound

from .imgcodec import COMPRESSION_FAST, FORMAT_PNG, image_encoder_factory
from .interface import ILegendableStyle, IRenderableStyle
from .legend import ILegendSymbols
from .model import SEED_STATUS_ENUM
from .util import af_transform

RenderResource = Annotated[
    List[int],
    Meta(
        min_length=1,
        description="Resources to render",
    ),
]

TileZ = Annotated[int, Meta(ge=0, le=22, description="Tile zoom level")]
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


class TileCacheSeedStatusResponse(Struct, kw_only=True):
    tstamp: datetime
    status: Literal[SEED_STATUS_ENUM]  # type: ignore
    progress: int
    total: int


class LegendIcon(Struct, kw_only=True):
    format: Literal["png"]
    data: bytes


class LegendSymbol(Struct, kw_only=True):
    display_name: str
    icon: LegendIcon


class InvalidOriginError(UserException):
    title = _("Invalid origin")
    message = _(
        "Origin validation is enabled for rendering requests, but the given "
        "origin doesn't match with the CORS origins list."
    )
    http_status_code = 403


PD_READ = DataScope.read

with open(Path(__file__).parent / "empty_256x256.png", "rb") as f:
    EMPTY_TILE_256x256 = f.read()


def rtoint(arg):
    return tuple(map(lambda c: int(round(c)), arg))


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
        elif size == (256, 256):
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


def tile(
    request,
    *,
    resource: RenderResource,
    z: TileZ,
    x: TileX,
    y: TileY,
    nd: NoDataStatusCode = 200,
    cache: TileCache = True,
) -> RenderResponse:
    """Render tile from one or more resources"""
    check_origin(request)

    p_cache = cache and request.env.render.tile_cache_enabled

    aimg = None
    for resid in resource:
        obj = Resource.filter_by(id=resid).one_or_none()

        if obj is None:
            raise ResourceNotFound(resid)

        if not IRenderableStyle.providedBy(obj):
            raise ValidationError("Resource (ID=%d) cannot be rendered." % (resid,))

        request.resource_permission(PD_READ, obj)

        rimg = None  # Resulting resource image

        tcache = obj.tile_cache

        # Is requested tile may be cached?
        cache_enabled = (
            p_cache
            and tcache is not None
            and tcache.enabled
            and (tcache.max_z is None or z <= tcache.max_z)
        )

        cache_exists = False
        if cache_enabled:
            cache_exists, rimg = tcache.get_tile((z, x, y))

        if not cache_exists:
            req = obj.render_request(obj.srs)
            rimg = req.render_tile((z, x, y), 256)

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

    return image_response(aimg, nd, (256, 256))


def image(
    request,
    *,
    resource: RenderResource,
    extent: RenderExtent,
    size: ImageSize,
    nd: NoDataStatusCode = 200,
    cache: TileCache = True,
    tdi: TileDebugInfo = False,
) -> RenderResponse:
    """Render image from one or more resources"""
    check_origin(request)

    p_cache = cache and request.env.render.tile_cache_enabled

    resolution = (
        (extent[2] - extent[0]) / size[0],
        (extent[3] - extent[1]) / size[1],
    )

    aimg = None
    zexact = None
    for resid in resource:
        obj = Resource.filter_by(id=resid).one_or_none()

        if obj is None:
            raise ResourceNotFound(resid)

        if not IRenderableStyle.providedBy(obj):
            raise ValidationError("Resource (ID=%d) cannot be rendered." % (resid,))

        request.resource_permission(PD_READ, obj)

        rimg = None

        if p_cache and zexact is None:
            if abs(resolution[0] - resolution[1]) < 1e-9:
                ztile = log((obj.srs.maxx - obj.srs.minx) / (256 * resolution[0]), 2)
                zexact = abs(round(ztile) - ztile) < 1e-9
                if zexact:
                    ztile = int(round(ztile))
            else:
                zexact = False

        tcache = obj.tile_cache

        # Is requested image may be cached via tiles?
        cache_enabled = (
            p_cache
            and zexact
            and tcache is not None
            and tcache.enabled
            and tcache.image_compose
            and (tcache.max_z is None or ztile <= tcache.max_z)
        )

        ext_extent = extent
        ext_size = size
        ext_offset = (0, 0)

        if cache_enabled:
            # Affine transform from layer to tile
            at_l2t = af_transform(
                (obj.srs.minx, obj.srs.miny, obj.srs.maxx, obj.srs.maxy),
                (0, 0, 2**ztile, 2**ztile),
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
                int(floor(t_lb[0]) if t_lb[0] == min(t_lb[0], t_rt[0]) else ceil(t_lb[0])),
                int(floor(t_lb[1]) if t_lb[1] == min(t_lb[1], t_rt[1]) else ceil(t_lb[1])),
                int(floor(t_rt[0]) if t_rt[0] == min(t_lb[0], t_rt[0]) else ceil(t_rt[0])),
                int(floor(t_rt[1]) if t_rt[1] == min(t_lb[1], t_rt[1]) else ceil(t_rt[1])),
            )

            ext_extent = at_t2l * tb[0:2] + at_t2l * tb[2:4]
            ext_im = rtoint(at_t2i * tb[0:2] + at_t2i * tb[2:4])
            ext_size = (ext_im[2] - ext_im[0], ext_im[1] - ext_im[3])
            ext_offset = (-ext_im[0], -ext_im[3])

            tx_range = tuple(range(min(tb[0], tb[2]), max(tb[0], tb[2])))
            ty_range = tuple(range(min(tb[1], tb[3]), max(tb[1], tb[3])))

            for tx, ty in product(tx_range, ty_range):
                cache_exists, timg = tcache.get_tile((ztile, tx, ty))
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
                            zxy=(ztile, tx, ty),
                            extent=at_t2l * (tx, ty) + at_t2l * (tx + 1, ty + 1),
                            msg=msg,
                        )

                    if timg is None:
                        continue

                    toffset = rtoint(at_t2i * (tx, ty))
                    rimg.paste(timg, toffset)

        if rimg is None:
            req = obj.render_request(obj.srs)
            rimg = req.render_extent(ext_extent, ext_size)

            empty_image = rimg is None

            if cache_enabled:
                tile_cache_failed = False
                for tx, ty in product(tx_range, ty_range):
                    t_offset = at_t2i * (tx, ty)
                    t_offset = rtoint((t_offset[0] + ext_offset[0], t_offset[1] + ext_offset[1]))
                    if empty_image:
                        timg = None
                    else:
                        timg = rimg.crop(t_offset + (t_offset[0] + 256, t_offset[1] + 256))

                    tile_cache_failed = tile_cache_failed or (
                        not obj.tile_cache.put_tile((ztile, tx, ty), timg)
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
                            zxy=(ztile, tx, ty),
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


def tile_cache_seed_status(request) -> AnyOf[TileCacheSeedStatusResponse, EmptyObject]:
    request.resource_permission(PD_READ)
    tc = request.context.tile_cache
    if tc is None:
        return

    return TileCacheSeedStatusResponse(
        tstamp=tc.seed_tstamp,
        status=tc.seed_status,
        progress=tc.seed_progress,
        total=tc.seed_total,
    )


def legend(request) -> Annotated[Response, ContentType("image/png")]:
    """Get resource legend image"""
    request.resource_permission(PD_READ)
    result = request.context.render_legend()
    return Response(body_file=result, content_type="image/png")


def legend_symbols_by_resource(resource, icon_size: int):
    result = list()

    for s in resource.legend_symbols(icon_size):
        buf = BytesIO()
        s.icon.save(buf, "png", compress_level=3)

        result.append(
            LegendSymbol(
                display_name=s.display_name,
                icon=LegendIcon(
                    format="png",
                    data=buf.getvalue(),
                ),
            )
        )

    return result


def legend_symbols(request, *, icon_size: int = 24) -> AsJSON[List[LegendSymbol]]:
    """Get resource legend symbols"""
    request.resource_permission(PD_READ)
    return legend_symbols_by_resource(request.context, icon_size)


def setup_pyramid(comp, config):
    renderable_style_factory = ResourceFactory(context=IRenderableStyle)

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
        "render.tile_cache.seed_status",
        "/api/resource/{id}/tile_cache/seed_status",
        factory=renderable_style_factory,
        get=tile_cache_seed_status,
    )

    config.add_route(
        "render.legend",
        "/api/resource/{id}/legend",
        factory=ResourceFactory(context=ILegendableStyle),
        get=legend,
    )

    config.add_route(
        "render.legend_symbols",
        "/api/resource/{id}/legend_symbols",
        factory=ResourceFactory(context=ILegendSymbols),
        get=legend_symbols,
    )
