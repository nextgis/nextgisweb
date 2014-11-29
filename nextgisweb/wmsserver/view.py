# -*- coding: utf-8 -*-
from __future__ import unicode_literals
from StringIO import StringIO

from lxml import etree
from lxml.builder import ElementMaker
from PIL import Image

from pyramid.response import Response

from ..resource import Resource, Widget, resource_factory
from ..spatial_ref_sys import SRS
from .model import Service


NS_XLINK = 'http://www.w3.org/1999/xlink'


class ServiceWidget(Widget):
    resource = Service
    operation = ('create', 'update')
    amdmod = 'ngw-wmsserver/ServiceWidget'


def handler(obj, request):
    params = dict((k.upper(), v) for k, v in request.params.iteritems())
    req = params.get('REQUEST')
    service = params.get('SERVICE')

    if (req == 'GetCapabilities') and (service == 'WMS'):
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
        E.Name(obj.keyname or 'WMS'),
        E.Title(obj.display_name),
        E.Abstract(obj.description or ''),
        OnlineResource()
    )

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

    layer = E.Layer(
        E.Title(obj.display_name),
        E.LatLonBoundingBox(dict(
            minx="-180.000000", miny="-85.051129",
            maxx="180.000000", maxy="85.051129"))
    )

    for l in obj.layers:
        lnode = E.Layer(
            dict(queryable="1"), E.Name(l.keyname),
            E.Title(l.display_name))

        for srs in SRS.query():
            lnode.append(E.SRS('EPSG:%d' % srs.id))

        layer.append(lnode)

    capability.append(layer)

    xml = E.WMS_Capabilities(
        dict(version='1.1.1'),
        service, capability)

    return Response(
        etree.tostring(xml, encoding='utf-8'),
        content_type=b'text/xml')


def _get_map(obj, request):
    params = dict((k.upper(), v) for k, v in request.params.iteritems())
    p_layers = params.get('LAYERS').split(',')
    p_bbox = map(float, params.get('BBOX').split(','))
    p_width = int(params.get('WIDTH'))
    p_height = int(params.get('HEIGHT'))
    p_format = params.get('FORMAT')
    p_srs = params.get('SRS')

    p_size = (p_width, p_height)

    lmap = dict([(l.keyname, l) for l in obj.layers])

    img = Image.new('RGBA', p_size, (255, 255, 255, 0))

    srs = SRS.filter_by(id=int(p_srs.split(':')[-1])).one()

    for lname in p_layers:
        lobj = lmap[lname]

        req = lobj.resource.render_request(srs)
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
        'wmsserver.wms', '/api/resource/{id:\d+}/wms',
        factory=resource_factory,
    ).add_view(handler, context=Service)

    config.add_route(
        '#wmsserver.wms', '/resource/{id:\d+}/wms',
        factory=resource_factory,
    ).add_view(handler, context=Service)

    Resource.__psection__.register(
        key='wmsserver', priority=50,
        title="Сервис WMS",
        is_applicable=lambda obj: obj.cls == 'wmsserver_service',
        template='nextgisweb:wmsserver/template/section.mako')
