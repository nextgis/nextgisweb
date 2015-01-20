# -*- coding: utf-8 -*-
from StringIO import StringIO

from pyramid.response import Response

from ..resource import resource_factory, DataScope

from .interface import IRenderableStyle

PD_READ = DataScope.read


def setup_pyramid(comp, config):

    def tms(obj, request):
        request.resource_permission(PD_READ)

        z = int(request.GET['z'])
        x = int(request.GET['x'])
        y = int(request.GET['y'])

        req = obj.render_request(obj.srs)
        img = req.render_tile((z, x, y), 256)

        buf = StringIO()
        img.save(buf, 'png')
        buf.seek(0)

        return Response(body_file=buf, content_type='image/png')

    config.add_route(
        'style.tms', '/resource/{id:\d+}/tms',
        factory=resource_factory, client=('id', )
    ).add_view(tms, context=IRenderableStyle)

    def image(obj, request):
        request.resource_permission(PD_READ)

        extent = map(float, request.GET['extent'].split(','))
        size = map(int, request.GET['size'].split(','))

        req = obj.render_request(obj.srs)
        img = req.render_extent(extent, size)

        buf = StringIO()
        img.save(buf, 'png')
        buf.seek(0)

        return Response(body_file=buf, content_type='image/png')

    config.add_route(
        'style.image', '/resource/{id:\d+}/image',
        factory=resource_factory, client=('id', )
    ).add_view(image, context=IRenderableStyle)
