import json
import math
from io import BytesIO

from lxml import etree, html
from lxml.builder import ElementMaker
from PIL import Image
from bunch import Bunch

from pyramid.response import Response
from pyramid.renderers import render as render_template
from pyramid.httpexceptions import HTTPBadRequest

from ..core.exception import ValidationError
from ..pyramid.exception import json_error
from ..lib.geometry import Geometry
from ..lib.ows import parse_request, parse_epsg_code
from ..render import ILegendableStyle
from ..resource import (
    Resource, Widget, resource_factory,
    ServiceScope, DataScope)
from ..spatial_ref_sys import SRS
from ..feature_layer import IFeatureLayer
from .. import geojson

from .model import Service
from .util import _


NS_XLINK = 'http://www.w3.org/1999/xlink'

GFI_RADIUS = 5
GFI_FEATURE_COUNT = 10


class ServiceWidget(Widget):
    resource = Service
    operation = ('create', 'update')
    amdmod = 'ngw-wmsserver/ServiceWidget'


def handler(obj, request):
    request.resource_permission(ServiceScope.connect)

    params, root_body = parse_request(request)

    req = params.get('REQUEST', '').upper()
    service = params.get('SERVICE', '').upper()

    if req == 'GETCAPABILITIES':
        if service != 'WMS':
            raise HTTPBadRequest("Invalid SERVICE parameter value.")
        return _get_capabilities(obj, params, request)
    elif req == 'GETMAP':
        return _get_map(obj, params, request)
    elif req == 'GETFEATUREINFO':
        return _get_feature_info(obj, params, request)
    elif req == 'GETLEGENDGRAPHIC':
        return _get_legend_graphic(obj, params, request)
    else:
        raise HTTPBadRequest("Invalid REQUEST parameter value.")


def _maker():
    return ElementMaker(nsmap=dict(xlink=NS_XLINK))


def _get_capabilities(obj, params, request):
    E = _maker()                                                    # NOQA

    OnlineResource = lambda: E.OnlineResource({                     # NOQA
        '{%s}type' % NS_XLINK: 'simple',
        '{%s}href' % NS_XLINK: request.path_url})

    DCPType = lambda: E.DCPType(E.HTTP(E.Get(OnlineResource())))    # NOQA

    abstract = html.document_fromstring(obj.description).text_content() \
        if obj.description is not None else ''

    service = E.Service(
        E.Name(obj.keyname or 'WMS'),
        E.Title(obj.display_name),
        E.Abstract(abstract),
        OnlineResource()
    )

    capability = E.Capability(
        E.Request(
            E.GetCapabilities(
                E.Format('text/xml'),
                DCPType()),
            E.GetMap(
                E.Format('image/png'),
                E.Format('image/jpeg'),
                DCPType()),
            E.GetFeatureInfo(
                E.Format('text/html'),
                DCPType()),
            E.GetLegendGraphic(
                E.Format('image/png'),
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

    for lyr in obj.layers:
        queryable = '1' if hasattr(lyr.resource, 'feature_layer') else '0'

        lnode = E.Layer(
            dict(queryable=queryable),
            E.Name(lyr.keyname),
            E.Title(lyr.display_name))

        if IFeatureLayer.providedBy(lyr.resource.parent):
            for srs in SRS.query():
                lnode.append(E.SRS('EPSG:%d' % srs.id))
        else:
            # Only Web Mercator is enabled for raster layers
            lnode.append(E.SRS('EPSG:3857'))

        layer.append(lnode)

    capability.append(layer)

    xml = E.WMT_MS_Capabilities(
        dict(version='1.1.1'),
        service, capability)

    return Response(
        etree.tostring(xml, encoding='utf-8'),
        content_type='text/xml')


def geographic_distance(lon_x, lat_x, lon_y, lat_y):
    """ Approximate calculation from
        https://qgis.org/api/2.18/qgsscalecalculator_8cpp_source.html#l00091 """
    lat = (lat_x + lat_y) / 2
    rads = math.pi / 180.0
    a = math.cos(lat * rads) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    ra = 6378000

    e = 0.0810820288

    radius = ra * (1.0 - e**2) / (1.0 - e**2 * math.sin(lat * rads)**2) ** 1.5
    meters = abs(lon_x - lon_y) / 180.0 * radius * c

    return meters


def _get_map(obj, params, request):
    p_layers = params.get('LAYERS').split(',')
    p_bbox = [float(v) for v in params.get('BBOX').split(',')]
    p_width = int(params.get('WIDTH'))
    p_height = int(params.get('HEIGHT'))
    p_format = params.get('FORMAT')
    p_srs = params.get('SRS', params.get('CRS'))

    p_size = (p_width, p_height)

    lmap = dict((lyr.keyname, lyr) for lyr in obj.layers)

    img = Image.new('RGBA', p_size, (255, 255, 255, 0))

    try:
        epsg = parse_epsg_code(p_srs)
    except ValueError:
        raise ValidationError("Invalid SRS/CRS parameter.")
    srs = SRS.filter_by(id=epsg).one()

    def scale(delta, img_px):
        dpi = 96
        img_inch = float(img_px) / dpi
        img_m = img_inch * 0.0254

        return delta / img_m

    if srs.is_geographic:
        distance = geographic_distance(*p_bbox)
    else:
        distance = p_bbox[2] - p_bbox[0]
    w_scale = scale(distance, p_width)

    for lname in p_layers:
        try:
            lobj = lmap[lname]
        except KeyError:
            raise ValidationError("Unknown layer: %s" % lname, data=dict(code="LayerNotDefined"))

        request.resource_permission(DataScope.read, lobj.resource)

        if (lobj.min_scale_denom is None or lobj.min_scale_denom >= w_scale) and \
                (lobj.max_scale_denom is None or w_scale >= lobj.max_scale_denom):
            req = lobj.resource.render_request(srs)
            limg = req.render_extent(p_bbox, p_size)
            if limg is not None:
                img.paste(limg, (0, 0), limg)

    buf = BytesIO()

    if p_format == 'image/jpeg':
        img.convert('RGB').save(buf, 'jpeg')
    elif p_format == 'image/png':
        img.save(buf, 'png', compress_level=3)

    buf.seek(0)

    return Response(body_file=buf, content_type=p_format)


def _get_feature_info(obj, params, request):
    p_bbox = [float(v) for v in params.get('BBOX').split(',')]
    p_width = int(params.get('WIDTH'))
    p_height = int(params.get('HEIGHT'))
    p_srs = params.get('SRS', params.get('CRS'))
    p_info_format = params.get('INFO_FORMAT', b'text/html')

    p_x = float(params.get('X'))
    p_y = float(params.get('Y'))
    p_query_layers = params.get('QUERY_LAYERS').split(',')
    p_feature_count = int(params.get('FEATURE_COUNT', GFI_FEATURE_COUNT))

    bw = p_bbox[2] - p_bbox[0]
    bh = p_bbox[3] - p_bbox[1]

    qbox = dict(
        l=p_bbox[0] + bw * (p_x - GFI_RADIUS) / p_width,
        b=p_bbox[3] - bh * (p_y + GFI_RADIUS) / p_height,
        r=p_bbox[0] + bw * (p_x + GFI_RADIUS) / p_width,
        t=p_bbox[3] - bh * (p_y - GFI_RADIUS) / p_height)

    try:
        epsg = parse_epsg_code(p_srs)
    except ValueError:
        raise ValidationError("Invalid SRS/CRS parameter.")
    srs = SRS.filter_by(id=epsg).one()

    qgeom = Geometry.from_wkt((
        "POLYGON((%(l)f %(b)f, %(l)f %(t)f, "
        + "%(r)f %(t)f, %(r)f %(b)f, %(l)f %(b)f))"
    ) % qbox, srs.id)

    lmap = dict((lyr.keyname, lyr) for lyr in obj.layers)

    results = list()
    fcount = 0

    for lname in p_query_layers:
        layer = lmap[lname]
        flayer = layer.resource.feature_layer

        request.resource_permission(DataScope.read, layer.resource)
        request.resource_permission(DataScope.read, flayer)

        query = flayer.feature_query()
        query.intersects(qgeom)

        # Limit number of layer features so that we
        # don't overshoot its total number
        query.limit(p_feature_count - fcount)

        features = list(query())
        fcount += len(features)

        results.append(Bunch(
            keyname=layer.keyname, display_name=layer.display_name,
            feature_layer=flayer, features=features))

        # Needed number of features found, stop search
        if fcount >= p_feature_count:
            break

    if p_info_format == 'application/json':
        result = [
            dict(
                keyname=result.keyname,
                display_name=result.display_name,
                features=[
                    {
                        fld.display_name: feature.fields[fld.keyname]
                        for fld in result.feature_layer.fields
                    }
                    for feature in result.features
                ],
            )
            for result in results
        ]
        return Response(
            json.dumps(result, cls=geojson.Encoder),
            content_type='application/json', charset='utf-8')

    return Response(render_template(
        'nextgisweb:wmsserver/template/get_feature_info_html.mako',
        dict(results=results, resource=obj), request=request
    ), content_type='text/html', charset='utf-8')


def _get_legend_graphic(obj, params, request):
    p_layer = params.get('LAYER')

    lmap = dict((lyr.keyname, lyr) for lyr in obj.layers)
    layer = lmap[p_layer]

    request.resource_permission(DataScope.read, layer.resource)

    if not ILegendableStyle.providedBy(layer.resource):
        raise ValidationError("Legend is not available for this layer")

    img = layer.resource.render_legend()

    return Response(body_file=img, content_type='image/png')


def error_renderer(request, err_info, exc, exc_info, debug=True):
    _json_error = json_error(request, err_info, exc, exc_info, debug=debug)
    err_title = _json_error.get('title')
    err_message = _json_error.get('message')

    if err_title is not None and err_message is not None:
        message = '%s: %s' % (err_title, err_message)
    elif err_message is not None:
        message = err_message
    else:
        message = "Unknown error"

    code = _json_error.get('data', dict()).get('code')

    root = etree.Element('ServiceExceptionReport', dict(version='1.1.1'))
    _exc = etree.Element('ServiceException', dict(code=code) if code is not None else None)
    _exc.text = message
    root.append(_exc)
    xml = etree.tostring(root)

    return Response(
        xml, content_type='application/xml', charset='utf-8',
        status_code=_json_error['status_code'])


def setup_pyramid(comp, config):
    config.add_route(
        'wmsserver.wms', r'/api/resource/{id:\d+}/wms',
        factory=resource_factory,
        error_renderer=error_renderer
    ).add_view(handler, context=Service)

    Resource.__psection__.register(
        key='description',
        title=_("External access"),
        is_applicable=lambda obj: obj.cls == 'wmsserver_service',
        template='nextgisweb:wmsserver/template/section_api_wms.mako')
