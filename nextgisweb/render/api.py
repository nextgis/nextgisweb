# -*- coding: utf-8 -*-
from __future__ import division, unicode_literals, print_function, absolute_import
from math import log, ceil, floor
from itertools import product
import six
from six import BytesIO

from PIL import Image, ImageDraw, ImageFont
from pyramid.response import Response
from pyramid.httpexceptions import HTTPBadRequest

from ..compat import Path
from ..resource import Resource, ResourceNotFound, DataScope, resource_factory, ValidationError

from .interface import ILegendableStyle, IRenderableStyle
from .util import af_transform


PD_READ = DataScope.read

with open(str(Path(__file__).parent / 'empty_256x256.png'), 'rb') as f:
    EMPTY_TILE_256x256 = f.read()


def rtoint(arg):
    return tuple(map(lambda c: int(round(c)), arg))


def tile_debug_info(img, offset=(0, 0), color='black',
                    zxy=None, extent=None, msg=None):
    """ Print tile debug info on image at given tile offset """
    drw = ImageDraw.Draw(img)
    drw.rectangle(offset + tuple(map(lambda c: c + 255, offset)), outline=color)
    ImageFont.load_default()
    text = []
    if zxy:
        text.append(six.text_type(zxy))
    if extent:
        text.append(six.text_type(extent[0:2]))
        text.append(six.text_type(extent[2:4]))
    if msg:
        text.append(msg)
    drw.text((8 + offset[0], 8 + offset[1]), '\n'.join(text), fill=color)
    return img


def image_response(img, empty_code, size):
    if img is None:
        if empty_code in ('204', '404'):
            return Response(status=empty_code)
        elif size == (256, 256):
            return Response(EMPTY_TILE_256x256, content_type='image/png')
        else:
            img = Image.new('RGBA', size)

    buf = BytesIO()
    img.save(buf, 'png', compress_level=3)
    buf.seek(0)

    return Response(body_file=buf, content_type='image/png')


def tile(request):
    z = int(request.GET['z'])
    x = int(request.GET['x'])
    y = int(request.GET['y'])

    p_resource = map(int, filter(None, request.GET['resource'].split(',')))
    p_cache = request.GET.get('cache', 'true').lower() in ('true', 'yes', '1') \
        and request.env.render.tile_cache_enabled
    p_empty_code = request.GET.get('nd', '200')

    aimg = None
    for resid in p_resource:
        obj = Resource.filter_by(id=resid).one_or_none()

        if obj is None:
            raise ResourceNotFound(resid)

        if not IRenderableStyle.providedBy(obj):
            raise ValidationError("Resource (ID=%d) cannot be rendered." % (resid,))

        request.resource_permission(PD_READ, obj)

        rimg = None  # Resulting resource image

        tcache = obj.tile_cache

        # Is requested tile may be cached?
        cache_enabled = p_cache and tcache is not None and tcache.enabled \
            and (tcache.max_z is None or z <= tcache.max_z)

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
                    "Image (ID=%d) must have mode %s, but it is %s mode." %
                    (obj.id, aimg.mode, rimg.mode))

    return image_response(aimg, p_empty_code, (256, 256))


def image(request):
    p_extent = tuple(map(float, request.GET['extent'].split(',')))
    p_size = tuple(map(int, request.GET['size'].split(',')))
    p_resource = map(int, filter(None, request.GET['resource'].split(',')))
    p_cache = request.GET.get('cache', 'true').lower() in ('true', 'yes', '1') \
        and request.env.render.tile_cache_enabled
    p_empty_code = request.GET.get('nd', '200')

    # Print tile debug info on resulting image
    tdi = request.GET.get('tdi', '').lower() in ('yes', 'true')

    resolution = (
        (p_extent[2] - p_extent[0]) / p_size[0],
        (p_extent[3] - p_extent[1]) / p_size[1],
    )

    aimg = None
    zexact = None
    for resid in p_resource:
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
            p_cache and zexact and tcache is not None
            and tcache.enabled and tcache.image_compose  # NOQA: W503
            and (tcache.max_z is None or ztile <= tcache.max_z))  # NOQA: W503

        ext_extent = p_extent
        ext_size = p_size
        ext_offset = (0, 0)

        if cache_enabled:
            # Affine transform from layer to tile
            at_l2t = af_transform(
                (obj.srs.minx, obj.srs.miny, obj.srs.maxx, obj.srs.maxy),
                (0, 0, 2 ** ztile, 2 ** ztile))
            at_t2l = ~at_l2t

            # Affine transform from layer to image
            at_l2i = af_transform(p_extent, (0, 0) + tuple(p_size))

            # Affine transform from tile to image
            at_t2i = at_l2i * ~at_l2t

            # Tile coordinates of render extent
            t_lb = tuple(at_l2t * p_extent[0:2])
            t_rt = tuple(at_l2t * p_extent[2:4])

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
                        rimg = Image.new('RGBA', p_size)

                    if tdi:
                        msg = 'CACHED'
                        if timg is None:
                            timg = Image.new('RGBA', p_size)
                            msg += ' EMPTY'
                        timg = tile_debug_info(
                            timg.convert('RGBA'), color='blue', zxy=(ztile, tx, ty),
                            extent=at_t2l * (tx, ty) + at_t2l * (tx + 1, ty + 1),
                            msg=msg)

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
                        not obj.tile_cache.put_tile((ztile, tx, ty), timg))

                    if tdi:
                        if rimg is None:
                            rimg = Image.new('RGBA', ext_size)
                        msg = 'NEW'
                        if empty_image:
                            msg += ' EMPTY'
                        rimg = tile_debug_info(
                            rimg, offset=t_offset, color='red', zxy=(ztile, tx, ty),
                            extent=at_t2l * (tx, ty) + at_t2l * (tx + 1, ty + 1),
                            msg=msg)

                    elif tile_cache_failed:
                        # Stop putting to the tile cache in case of its failure.
                        break

            if rimg is None:
                continue

            rimg = rimg.crop((
                ext_offset[0], ext_offset[1],
                ext_offset[0] + p_size[0],
                ext_offset[1] + p_size[1]
            ))

        if aimg is None:
            aimg = rimg
        else:
            try:
                aimg = Image.alpha_composite(aimg, rimg)
            except ValueError:
                raise HTTPBadRequest(
                    "Image (ID=%d) must have mode %s, but it is %s mode." %
                    (obj.id, aimg.mode, rimg.mode))

    return image_response(aimg, p_empty_code, p_size)


def tile_cache_seed_status(request):
    request.resource_permission(PD_READ)
    tc = request.context.tile_cache
    if tc is None:
        return dict()

    return dict(
        tstamp=tc.seed_tstamp,
        status=tc.seed_status,
        progress=tc.seed_progress,
        total=tc.seed_total,
    )


def legend(request):
    request.resource_permission(PD_READ)
    result = request.context.render_legend()
    return Response(body_file=result, content_type='image/png')


def setup_pyramid(comp, config):
    config.add_route(
        'render.tile', r'/api/component/render/tile'
    ).add_view(tile)

    config.add_route(
        'render.image', r'/api/component/render/image'
    ).add_view(image, http_cache=0)

    config.add_route(
        'render.tile_cache.seed_status', r'/api/resource/{id:\d+}/tile_cache/seed_status',
        factory=resource_factory
    ).add_view(
        tile_cache_seed_status, context=IRenderableStyle,
        request_method='GET', renderer='json'
    )

    config.add_route(
        'render.legend', r'/api/resource/{id:\d+}/legend',
        factory=resource_factory
    ).add_view(legend, context=ILegendableStyle, request_method='GET')
