# -*- coding: utf-8 -*-
from __future__ import unicode_literals
from StringIO import StringIO

from lxml import etree
from lxml.builder import ElementMaker
from PIL import Image

from pyramid.response import Response

from ..resource import Widget, resource_factory
from .model import Service


NS_XLINK = 'http://www.w3.org/1999/xlink'


class ServiceWidget(Widget):
    resource = Service
    operation = ('create', 'update')
    amdmod = 'ngw-wfsserver/ServiceWidget'


def handler(obj, request):
    if request.params.get('SERVICE') != 'WMS':
        return

    req = request.params.get('REQUEST')

    if req == 'GetCapabilities':
        return _get_capabilities(obj, request)
    elif req == 'GetMap':
        return _get_map(obj, request)


def _maker():
    return ElementMaker(nsmap=dict(xlink=NS_XLINK))


def _get_capabilities(obj, request):
    E = _maker()

    OnlineResource = lambda: E.OnlineResource({
        '{%s}type' % NS_XLINK: 'simple',
        '{%s}href' % NS_XLINK: request.path_url})

    DCPType = lambda: E.DCPType(E.HTTP(E.Get(OnlineResource())))

    service = E.Service(
        E.Name('WMS'), E.Title('WMS'),
        OnlineResource())

    capability = E.Capability(
        E.Request(
            E.GetCapabilities(
                E.Format('text/xml'),
                DCPType()),
            E.GetMap(
                E.Format('image/png'), E.Format('image/jpeg'),
                DCPType())
        ),
        E.Exception(E.Format('text/xml'))
    )

    for l in obj.layers:
        capability.append(E.Layer(
            dict(queryable="1"),
            E.Name(l.keyname),
            E.Title(l.display_name),
            E.SRS('EPSG:%d' % l.resource.srs.id),
            E.LatLonBoundingBox(dict(
                minx="-180", miny="-90",
                maxx="180", maxy="90"))
        ))

    xml = E.WMS_Capabilities(
        dict(version='1.1.1'),
        service, capability)

    return Response(etree.tostring(xml), content_type=b'text/xml')


def _get_map(obj, request):
    p_layers = request.params.get('LAYERS').split(',')
    p_bbox = map(float, request.params.get('BBOX').split(','))
    p_width = int(request.params.get('WIDTH'))
    p_height = int(request.params.get('HEIGHT'))
    p_format = request.params.get('FORMAT')

    p_size = (p_width, p_height)

    lmap = dict([(l.keyname, l) for l in obj.layers])

    img = Image.new('RGBA', p_size, (255, 255, 255, 255))

    for lname in p_layers:
        lobj = lmap[lname]

        req = lobj.resource.render_request(lobj.resource.srs)
        limg = req.render_extent(p_bbox, p_size)
        img.paste(limg, (0, 0), limg)

    buf = StringIO()
    
    if p_format == 'image/jpeg':
        img.save(buf, 'jpeg')
    elif p_format == 'image/png':
        img.save(buf, 'png')
    
    buf.seek(0)

    return Response(body_file=buf, content_type=b'image/png')


def setup_pyramid(comp, config):
    config.add_route(
        'wfsclient.wfs', '/resource/{id:\d+}/wfs',
        factory=resource_factory, client=('id',)
    ).add_view(handler, context=Service)
