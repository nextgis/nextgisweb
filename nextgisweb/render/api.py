# -*- coding: utf-8 -*-
from __future__ import unicode_literals, print_function, absolute_import
from math import log, ceil, floor
from itertools import product
from StringIO import StringIO

from PIL import Image
from affine import Affine
from pyramid.response import Response
from pyramid.httpexceptions import HTTPBadRequest

from ..resource import Resource, DataScope

PD_READ = DataScope.read
sett_name = 'permissions.disable_check.rendering'


def af_transform(a, b):
    """ Crate affine transform from coordinate system A to B """
    return ~(Affine.translation(a[0], a[3])
        * Affine.scale((a[2] - a[0]) / b[2], (a[1] - a[3]) / b[3])
        * Affine.translation(b[0], b[1]))


def rtoint(arg):
    return tuple(map(lambda c: int(round(c)), arg))


def tile(request):
    setting_disable_check = request.env.core.settings.get(sett_name, 'false').lower()
    if setting_disable_check in ('true', 'yes', '1'):
        setting_disable_check = True
    else:
        setting_disable_check = False

    z = int(request.GET['z'])
    x = int(request.GET['x'])
    y = int(request.GET['y'])

    p_resource = map(int, filter(None, request.GET['resource'].split(',')))

    aimg = None
    for resid in p_resource:
        obj = Resource.filter_by(id=resid).one()
        if not setting_disable_check:
            request.resource_permission(PD_READ, obj)
        
        rimg = None  # Resulting resource image

        tcache = obj.tile_cache

        # Is requested tile may be cached?
        cached = tcache is not None and tcache.enabled \
            and (tcache.max_z is None or z <= tcache.max_z)
        
        if cached:
            rimg = tcache.get_tile((z, x, y))

        if not rimg:
            req = obj.render_request(obj.srs)
            rimg = req.render_tile((z, x, y), 256)

            if cached:
                tcache.put_tile((z, x, y), rimg)

        if aimg is None:
            aimg = rimg
        else:
            try:
                aimg = Image.alpha_composite(aimg, rimg)
            except ValueError:
                raise HTTPBadRequest(
                    "Image (ID=%d) must have mode %s, but it is %s mode." %
                    (obj.id, aimg.mode, rimg.mode))

    # If there were no resources for rendering, return empty image
    if aimg is None:
        aimg = Image.new('RGBA', (256, 256))

    buf = StringIO()
    aimg.save(buf, 'png')
    buf.seek(0)

    return Response(body_file=buf, content_type=b'image/png')


def image(request):
    setting_disable_check = request.env.core.settings.get(sett_name, 'false').lower()
    if setting_disable_check in ('true', 'yes', '1'):
        setting_disable_check = True
    else:
        setting_disable_check = False

    p_extent = map(float, request.GET['extent'].split(','))
    p_size = map(int, request.GET['size'].split(','))
    p_resource = map(int, filter(None, request.GET['resource'].split(',')))

    resolution = (
        (p_extent[2] - p_extent[0]) / p_size[0],
        (p_extent[3] - p_extent[1]) / p_size[1],
    )

    aimg = None
    zexact = None
    for resid in p_resource:
        obj = Resource.filter_by(id=resid).one()
        if not setting_disable_check:
            request.resource_permission(PD_READ, obj)

        rimg = None

        if zexact is None:
            if abs(resolution[0] - resolution[1]) < 1e-9:
                ztile = log((obj.srs.maxx - obj.srs.minx) / (256 * resolution[0]), 2)
                zexact = abs(round(ztile) - ztile) < 1e-9
                if zexact:
                    ztile = int(round(ztile))
            else:
                zexact = False

        # Is requested image may be cached via tiles?
        cached = zexact and obj.tile_cache is not None and obj.tile_cache.enabled \
            and (obj.tile_cache.max_z is None or ztile <= obj.tile_cache.max_z)

        ext_extent = p_extent
        ext_size = p_size
        ext_offset = (0, 0)

        if cached:
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

            tx_range = tuple(range(min(tb[0], tb[2]), max(tb[0], tb[2]) + 1))
            ty_range = tuple(range(min(tb[1], tb[3]), max(tb[1], tb[3]) + 1))

            for tx, ty in product(tx_range, ty_range):
                timg = obj.tile_cache.get_tile((ztile, tx, ty))
                if timg is None:
                    rimg = None
                    break
                else:
                    if rimg is None:
                        rimg = Image.new('RGBA', p_size)
                    toffset = rtoint(at_t2i * (tx, ty))
                    rimg.paste(timg, toffset)
   
        if rimg is None:
            req = obj.render_request(obj.srs)
            rimg = req.render_extent(ext_extent, ext_size)

            if cached:
                for tx, ty in product(tx_range, ty_range):
                    t_offset = at_t2i * (tx, ty)
                    t_offset = rtoint((t_offset[0] + ext_offset[0], t_offset[1] + ext_offset[1]))
                    timg = rimg.crop(t_offset + (t_offset[0] + 256, t_offset[1] + 256))
                    obj.tile_cache.put_tile((ztile, tx, ty), timg)
        
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

    # If there were no resources for rendering, return empty image
    if aimg is None:
        aimg = Image.new('RGBA', p_size)

    buf = StringIO()
    aimg.save(buf, 'png')
    buf.seek(0)

    return Response(body_file=buf, content_type=b'image/png')


def setup_pyramid(comp, config):
    config.add_route('render.tile', '/api/component/render/tile') \
        .add_view(tile)

    config.add_route('render.image', '/api/component/render/image') \
        .add_view(image, http_cache=0)
