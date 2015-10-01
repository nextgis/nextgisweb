# -*- coding: utf-8 -*-
from __future__ import unicode_literals, print_function, absolute_import
from StringIO import StringIO

from PIL import Image
from pyramid.response import Response

from ..resource import Resource, DataScope

PD_READ = DataScope.read
sett_name = 'permissions.disable_check.rendering'


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
        req = obj.render_request(obj.srs)
        rimg = req.render_tile((z, x, y), 256)
        if aimg is None:
            aimg = rimg
        else:
            aimg = Image.alpha_composite(aimg, rimg)

    # Если не было ресурсов для отрисовки, возвращаем пустую картинку
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

    aimg = None
    for resid in p_resource:
        obj = Resource.filter_by(id=resid).one()
        if not setting_disable_check:
            request.resource_permission(PD_READ, obj)
        req = obj.render_request(obj.srs)
        rimg = req.render_extent(p_extent, p_size)
        if aimg is None:
            aimg = rimg
        else:
            aimg = Image.alpha_composite(aimg, rimg)

    # Если не было ресурсов для отрисовки, возвращаем пустую картинку
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
        .add_view(image)
