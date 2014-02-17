# -*- coding: utf-8 -*-
from StringIO import StringIO

from pyramid.response import Response

from ..resource import resource_factory

from .interface import IRenderableStyle


def setup_pyramid(comp, config):

    def tms(obj, request):
        # TODO: Security

        z = int(request.GET['z'])
        x = int(request.GET['x'])
        y = int(request.GET['y'])

        req = obj.render_request(obj.parent.srs)
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
        # TODO: Security

        extent = map(float, request.GET['extent'].split(','))
        size = map(int, request.GET['size'].split(','))

        layer = obj.parent

        if extent[0] < layer.srs.minx:
            # Костыль для 180
            extent = (
                extent[0] + layer.srs.maxx - layer.srs.minx, extent[1],
                extent[2] + layer.srs.maxx - layer.srs.minx, extent[3],
            )

        req = obj.render_request(layer.srs)
        img = req.render_extent(extent, size)

        buf = StringIO()
        img.save(buf, 'png')
        buf.seek(0)

        return Response(body_file=buf, content_type='image/png')

    config.add_route(
        'style.image', '/resource/{id:\d+}/image',
        factory=resource_factory, client=('id', )
    ).add_view(image, context=IRenderableStyle)
