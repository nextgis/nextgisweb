import math
from io import BytesIO
from urllib.parse import quote

import numpy
from lxml import etree, html
from lxml.builder import ElementMaker
from osgeo import gdal, gdal_array
from PIL import Image, ImageColor, ImageDraw, ImageFont
from pyramid.httpexceptions import HTTPBadRequest
from pyramid.renderers import render as render_template
from pyramid.response import Response
from sqlalchemy.orm.exc import NoResultFound

from nextgisweb.lib.geometry import Geometry
from nextgisweb.lib.imptool import module_path
from nextgisweb.lib.json import dumps
from nextgisweb.lib.ows import SRSParseError, parse_request, parse_srs

from nextgisweb.core.exception import InsufficientPermissions, ValidationError
from nextgisweb.pyramid.exception import json_error
from nextgisweb.render import (
    COMPRESSION_DEFAULT,
    COMPRESSION_FAST,
    FORMAT_JPEG,
    FORMAT_PNG,
    ILegendableStyle,
    IRenderableScaleRange,
    image_encoder_factory,
    scale_range_intersection,
)
from nextgisweb.render.api import EMPTY_TILE_256x256
from nextgisweb.resource import DataScope, ResourceFactory, ServiceScope
from nextgisweb.spatial_ref_sys import SRS
from nextgisweb.spatial_ref_sys.model import BOUNDS_EPSG_3857

from .model import Service

NS_XLINK = "http://www.w3.org/1999/xlink"

GFI_RADIUS = 5
GFI_FEATURE_COUNT = 1


class IMAGE_FORMAT:
    PNG = "image/png"
    JPEG = "image/jpeg"

    enum = (PNG, JPEG)


def layer_by_keyname(service, keyname):
    for layer in service.layers:
        if layer.keyname == keyname:
            return layer
    raise ValidationError(
        message="Unknown layer: '%s'." % keyname,
        data=dict(code="LayerNotDefined"),
    )


def _wms_auth(request):
    try:
        request.resource_permission(ServiceScope.connect)
    except InsufficientPermissions:
        if request.authenticated_userid is None:
            # Force 401 Unauthorized for unauthenticated users. It's useful for
            # MapInfo because there is no way to give user credentials directly
            # there.

            # TODO: Maybe it should be implemented in the error handler with an
            # additional option to enable this behavior.
            return Response(status_code=401, headers={"WWW-Authenticate": "Basic"})

        raise


def wms_handler(obj, request):
    """WMS/WMTS endpoint"""
    _wms_auth(request)

    params, root_body = parse_request(request)

    req = params.get("REQUEST", "").upper()
    service = params.get("SERVICE", "").upper()

    if service == "WMS":
        if req == "GETCAPABILITIES":
            return _get_capabilities(obj, params, request)
        elif req == "GETMAP" or req == "MAP":
            return _get_map(obj, params, request)
        elif req == "GETFEATUREINFO":
            return _get_feature_info(obj, params, request)
        elif req == "GETLEGENDGRAPHIC":
            return _get_legend_graphic(obj, params, request)
        raise HTTPBadRequest(explanation="Invalid REQUEST parameter value.")
    elif service == "WMTS":
        if req == "GETCAPABILITIES":
            return _get_wmts_capabilities(obj, request)
        elif req == "GETTILE":
            return _get_wmts_tile(obj, params, request)
        raise HTTPBadRequest(explanation="Invalid REQUEST parameter value.")

    raise HTTPBadRequest(explanation="Invalid SERVICE parameter value.")


def _get_capabilities(obj, params, request):
    E = ElementMaker(nsmap={"xlink": NS_XLINK})

    OnlineResource = lambda url: E.OnlineResource(
        {"{%s}type" % NS_XLINK: "simple", "{%s}href" % NS_XLINK: url}
    )

    DCPType = lambda: E.DCPType(E.HTTP(E.Get(OnlineResource("{}?".format(request.path_url)))))

    abstract = (
        html.document_fromstring(obj.description).text_content()
        if obj.description is not None
        else ""
    )

    service = E.Service(
        E.Name("OGC:WMS"),
        E.Title(obj.display_name),
        E.Abstract(abstract),
        OnlineResource(request.path_url),
    )

    capability = E.Capability(
        E.Request(
            E.GetCapabilities(E.Format("application/vnd.ogc.wms_xml"), DCPType()),
            E.GetMap(E.Format(IMAGE_FORMAT.PNG), E.Format(IMAGE_FORMAT.JPEG), DCPType()),
            E.GetFeatureInfo(E.Format("text/html"), E.Format("application/json"), DCPType()),
            E.GetLegendGraphic(E.Format(IMAGE_FORMAT.PNG), DCPType()),
        ),
        E.Exception(
            E.Format("application/vnd.ogc.se_xml"), E.Format("application/vnd.ogc.se_inimage")
        ),
    )

    layer = E.Layer(E.Title(obj.display_name))

    for srs in SRS.filter_by(auth_name="EPSG"):
        layer.append(E.SRS("EPSG:%d" % srs.auth_srid))

    layer.append(
        E.LatLonBoundingBox(
            dict(minx="-180.000000", miny="-85.051129", maxx="180.000000", maxy="85.051129")
        )
    )

    for lyr in obj.layers:
        if not lyr.resource.has_permission(DataScope.read, request.user):
            continue
        queryable = "1" if lyr.is_queryable else "0"

        lnode = E.Layer(
            dict(queryable=queryable),
            E.Name(lyr.keyname),
            E.Title(lyr.display_name),
            E.SRS("EPSG:3857"),
        )

        layer.append(lnode)

    capability.append(layer)

    xml = E.WMT_MS_Capabilities(dict(version="1.1.1"), service, capability)

    doctype = '<!DOCTYPE WMT_MS_Capabilities SYSTEM "http://schemas.opengis.net/wms/1.1.1/WMS_MS_Capabilities.dtd">'

    return Response(
        etree.tostring(
            xml,
            xml_declaration=True,
            doctype=doctype,
            encoding="utf-8",
            pretty_print=True,
        ),
        content_type="application/vnd.ogc.wms_xml",
    )


def geographic_distance(lon_x, lat_x, lon_y, lat_y):
    """Approximate calculation from
    https://qgis.org/api/2.18/qgsscalecalculator_8cpp_source.html#l00091"""
    lat = (lat_x + lat_y) / 2
    rads = math.pi / 180.0
    a = math.cos(lat * rads) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    ra = 6378000

    e = 0.0810820288

    radius = ra * (1.0 - e**2) / (1.0 - e**2 * math.sin(lat * rads) ** 2) ** 1.5
    meters = abs(lon_x - lon_y) / 180.0 * radius * c

    return meters


def _validate_bbox(bbox):
    if len(bbox) != 4:
        raise ValidationError("Invalid BBOX parameter.")

    xmin, ymin, xmax, ymax = bbox

    if xmin >= xmax:
        raise ValidationError("BBOX parameter's minimum X must be lower than the maximum X.")

    if ymin >= ymax:
        raise ValidationError("BBOX parameter's minimum Y must be lower than the maximum Y.")

    return bbox


def _validate_bgcolor(bgcolor):
    if not bgcolor.startswith("0x"):
        raise ValidationError("BGCOLOR parameter should start with '0x'.")

    bgcolor = bgcolor.replace("0x", "#")
    try:
        color = ImageColor.getrgb(bgcolor)
    except ValueError:
        raise ValidationError("BGCOLOR parameter has unknown color specifier.")

    return color


image_encoder_png = image_encoder_factory(FORMAT_PNG, COMPRESSION_FAST)
image_encoder_jpeg = image_encoder_factory(FORMAT_JPEG, COMPRESSION_DEFAULT)


def _get_map(obj, params, request):
    p_layers = params["LAYERS"].split(",")
    p_bbox = _validate_bbox([float(v) for v in params["BBOX"].split(",", 3)])
    p_width = int(params["WIDTH"])
    p_height = int(params["HEIGHT"])
    p_format = params.get("FORMAT", IMAGE_FORMAT.PNG)
    p_style = params.get("STYLES")
    p_bgcolor = params.get("BGCOLOR")
    p_transparent = params.get("TRANSPARENT", "FALSE")
    p_srs = params.get("SRS", params.get("CRS"))

    if p_format not in IMAGE_FORMAT.enum:
        raise ValidationError("Invalid FORMAT parameter.", data=dict(code="InvalidFormat"))
    if p_style and not (p_style == "," * (len(p_layers) - 1)):
        raise ValidationError("Style not found.", data=dict(code="StyleNotDefined"))
    if p_srs is None:
        raise ValidationError(message="CRS/SRS parameter required.")

    img_params = dict()
    if p_bgcolor:
        r, g, b = _validate_bgcolor(p_bgcolor)
        bgcolor = (r, g, b)
    else:
        bgcolor = (255, 255, 255)
    if p_transparent.upper() == "FALSE":
        img_params["color"] = bgcolor + (255,)

    p_size = (p_width, p_height)

    img = Image.new("RGBA", p_size, **img_params)

    try:
        epsg, axis_sy = parse_srs(p_srs)
    except SRSParseError as e:
        raise ValidationError(message=str(e), data=dict(code="InvalidSRS"))
    try:
        srs = SRS.filter_by(id=epsg).one()
    except NoResultFound:
        raise ValidationError(
            message="SRS (id=%d) not found." % epsg, data=dict(code="InvalidSRS")
        )

    def scale(delta, img_px):
        dpi = 96
        img_inch = float(img_px) / dpi
        img_m = img_inch * 0.0254

        return delta / img_m

    xmin, ymin, xmax, ymax = p_bbox

    if srs.is_geographic:
        distance = geographic_distance(xmin, ymin, xmax, ymax)
    else:
        distance = xmax - xmin
    w_scale = scale(distance, p_width)

    for lname in p_layers:
        lobj = layer_by_keyname(obj, lname)

        res = lobj.resource
        request.resource_permission(DataScope.read, res)

        scale_range = lobj.scale_range()
        if IRenderableScaleRange.providedBy(res):
            scale_range = scale_range_intersection(scale_range, res.scale_range())

        if (scale_range[0] is None or scale_range[0] >= w_scale) and (
            scale_range[1] is None or w_scale >= scale_range[1]
        ):
            req = res.render_request(res.srs)

            # Do not use foreign SRS as it does not work correctly yet
            if srs.id == res.srs.id:
                limg = req.render_extent(p_bbox, p_size)
            else:
                mem = gdal.GetDriverByName("MEM")

                dst_geo = (xmin, (xmax - xmin) / p_width, 0, ymax, 0, (ymin - ymax) / p_height)
                dst_ds = mem.Create("", p_width, p_height, 4, gdal.GDT_Byte)
                dst_ds.SetGeoTransform(dst_geo)

                vrt = gdal.AutoCreateWarpedVRT(dst_ds, srs.wkt, res.srs.wkt)
                src_width = vrt.RasterXSize
                src_height = vrt.RasterYSize
                src_geo = vrt.GetGeoTransform()
                vrt = None

                src_bbox = (
                    src_geo[0],
                    src_geo[3] + src_geo[5] * src_height,
                    src_geo[0] + src_geo[1] * src_width,
                    src_geo[3],
                )
                limg = req.render_extent(src_bbox, (src_width, src_height))

                if limg is not None:
                    data = numpy.asarray(limg)
                    img_h, img_w, band_count = data.shape

                    src_ds = mem.Create("", src_width, src_height, band_count, gdal.GDT_Byte)
                    src_ds.SetGeoTransform(src_geo)
                    for i in range(band_count):
                        bandArray = data[:, :, i]
                        src_ds.GetRasterBand(i + 1).WriteArray(bandArray)

                    gdal.ReprojectImage(src_ds, dst_ds, res.srs.wkt, srs.wkt)

                    array = numpy.zeros((p_height, p_width, band_count), numpy.uint8)
                    for i in range(band_count):
                        array[:, :, i] = gdal_array.BandReadAsArray(dst_ds.GetRasterBand(i + 1))
                    limg = Image.fromarray(array)

                    src_ds = dst_ds = None

            if limg is not None:
                img = Image.alpha_composite(img, limg)

    buf = BytesIO()

    if p_format == IMAGE_FORMAT.JPEG:
        image_encoder_jpeg(img, buf)
    elif p_format == IMAGE_FORMAT.PNG:
        image_encoder_png(img, buf)
    else:
        raise ValueError

    buf.seek(0)

    return Response(body_file=buf, content_type=p_format)


def _get_feature_info(obj, params, request):
    p_bbox = _validate_bbox([float(v) for v in params.get("BBOX").split(",")])
    p_width = int(params.get("WIDTH"))
    p_height = int(params.get("HEIGHT"))
    p_srs = params.get("SRS", params.get("CRS"))
    if p_srs is None:
        raise ValidationError(message="CRS/SRS parameter required.")
    p_info_format = params.get("INFO_FORMAT", "text/html")

    p_x = float(params.get("X", params.get("I")))
    p_y = float(params.get("Y", params.get("J")))
    p_query_layers = params.get("QUERY_LAYERS").split(",")
    p_feature_count = int(params.get("FEATURE_COUNT", GFI_FEATURE_COUNT))

    bw = p_bbox[2] - p_bbox[0]
    bh = p_bbox[3] - p_bbox[1]

    qbox = dict(
        l=p_bbox[0] + bw * (p_x - GFI_RADIUS) / p_width,
        b=p_bbox[3] - bh * (p_y + GFI_RADIUS) / p_height,
        r=p_bbox[0] + bw * (p_x + GFI_RADIUS) / p_width,
        t=p_bbox[3] - bh * (p_y - GFI_RADIUS) / p_height,
    )

    try:
        epsg, axis_xy = parse_srs(p_srs)
    except SRSParseError as e:
        raise ValidationError(str(e))
    try:
        srs = SRS.filter_by(id=epsg).one()
    except NoResultFound:
        raise ValidationError(message="SRS (id=%d) not found." % epsg)

    qgeom = Geometry.from_wkt(
        ("POLYGON((%(l)f %(b)f, %(l)f %(t)f, " + "%(r)f %(t)f, %(r)f %(b)f, %(l)f %(b)f))") % qbox,
        srs.id,
    )

    results = list()
    fcount = 0

    for lname in p_query_layers:
        layer = layer_by_keyname(obj, lname)
        if not layer.is_queryable:
            raise ValidationError(
                f"Layer '{layer.keyname}' not queryable.",
                data=dict(code="LayerNotQueryable"),
            )
        flayer = layer.resource.feature_layer

        request.resource_permission(DataScope.read, layer.resource)
        request.resource_permission(DataScope.read, flayer)

        query = flayer.feature_query()
        query.geom()
        query.intersects(qgeom)

        # Limit number of layer features so that we
        # don't overshoot its total number
        query.limit(p_feature_count - fcount)

        features = list(query())
        fcount += len(features)

        results.append(
            dict(
                keyname=layer.keyname,
                display_name=layer.display_name,
                feature_layer=flayer,
                features=features,
            )
        )

        # Needed number of features found, stop search
        if fcount >= p_feature_count:
            break

    if p_info_format == "application/json":
        data = dict(
            type="FeatureCollection",
            totalFeatures="unknown",
            features=[],
            crs=dict(type="name", properties=dict(name=f"urn:ogc:def:crs:EPSG::{epsg}")),
        )
        for result in results:
            for f in result["features"]:
                data["features"].append(
                    dict(
                        type="Feature",
                        id=result["keyname"] + "." + str(f.id),
                        properties=f.fields,
                        geometry=f.geom.to_geojson(),
                    )
                )
        return Response(dumps(data), content_type="application/json", charset="utf-8")

    return Response(
        render_template(
            "nextgisweb:wmsserver/template/get_feature_info_html.mako",
            dict(results=results, resource=obj),
            request=request,
        ),
        content_type="text/html",
        charset="utf-8",
    )


def _get_legend_graphic(obj, params, request):
    p_layer = params.get("LAYER")

    layer = layer_by_keyname(obj, p_layer)
    request.resource_permission(DataScope.read, layer.resource)

    if not ILegendableStyle.providedBy(layer.resource):
        raise ValidationError("Legend is not available for this layer")

    img = layer.resource.render_legend()

    return Response(body_file=img, content_type=IMAGE_FORMAT.PNG)


def error_renderer(request, err_info, exc, exc_info, debug=True):
    params, _ = parse_request(request)

    _json_error = json_error(request, err_info, exc, exc_info, debug=debug)
    err_title = _json_error.get("title")
    err_message = _json_error.get("message")

    if err_title is not None and err_message is not None:
        message = "%s: %s" % (err_title, err_message)
    elif err_message is not None:
        message = err_message
    else:
        message = "Unknown error"

    exc_type = params.get("EXCEPTIONS")

    if exc_type == "application/vnd.ogc.se_inimage":
        # when an exception is raised and EXCEPTIONS=application/vnd.ogc.se_inimage,
        # then the error messages are graphically returned as part of the content
        p_width = int(params["WIDTH"])
        p_height = int(params["HEIGHT"])
        p_format = params.get("FORMAT", IMAGE_FORMAT.PNG)
        p_size = (p_width, p_height)

        img = Image.new("RGBA", p_size, (255, 255, 255, 0))
        draw = ImageDraw.Draw(img)
        ttf = str(module_path("nextgisweb.wmsserver") / "fonts/DejaVuSansMono.ttf")
        font = ImageFont.truetype(ttf, 10)
        draw.text((10, 10), message, font=font, fill="grey")

        buf = BytesIO()

        if p_format == IMAGE_FORMAT.JPEG:
            image_encoder_jpeg(img, buf)
        elif p_format == IMAGE_FORMAT.PNG:
            image_encoder_png(img, buf)
        else:
            raise ValueError

        buf.seek(0)

        return Response(body_file=buf, content_type=p_format)

    code = _json_error.get("data", dict()).get("code")

    root = etree.Element("ServiceExceptionReport", dict(version="1.1.1"))
    _exc = etree.Element("ServiceException", dict(code=code) if code is not None else None)
    _exc.text = message
    root.append(_exc)
    xml = etree.tostring(root)

    return Response(
        xml,
        content_type="application/vnd.ogc.se_xml",
        charset="utf-8",
        status_code=_json_error["status_code"],
    )


def wmts_rest_handler(obj, request):
    """WMTS REST endpoint"""
    _wms_auth(request)

    return _get_wmts_capabilities(obj, request)


def _get_wmts_capabilities(obj, request):
    NS_OWS = "http://www.opengis.net/ows/1.1"
    E = ElementMaker(
        nsmap={
            None: "http://www.opengis.net/wmts/1.0",
            "ows": NS_OWS,
            "xlink": NS_XLINK,
            "xsi": "http://www.w3.org/2001/XMLSchema-instance",
            "gml": "http://www.opengis.net/gml",
        },
    )
    E_OWS = ElementMaker(namespace=NS_OWS)

    service_url = request.route_url("wmsserver.wms", id=obj.id) + "?"

    operations_metadata = E_OWS.OperationsMetadata()
    for op in ("GetCapabilities", "GetTile"):
        operations_metadata.append(
            E_OWS.Operation(
                E_OWS.DCP(
                    E_OWS.HTTP(
                        E_OWS.Get(
                            E_OWS.Constraint(
                                E_OWS.AllowedValues(E_OWS.Value("KVP")),
                                name="GetEncoding",
                            ),
                            {"{%s}href" % NS_XLINK: service_url},
                        )
                    )
                ),
                name=op,
            )
        )

    tile_matrix_id = "EPSG:3857"

    # Don't need urlencode here
    tile_url = (
        service_url
        + "service=WMTS&request=GetTile&layer=%s&TileMatrix={TileMatrix}&TileCol={TileCol}&TileRow={TileRow}"
    )

    layers = []
    for layer in obj.layers:
        if not layer.resource.has_permission(DataScope.read, request.user):
            continue
        layers.append(
            E.Layer(
                E_OWS.Title(layer.display_name),
                E_OWS.Identifier(layer.keyname),
                E_OWS.WGS84BoundingBox(
                    E_OWS.LowerCorner("-180 -85.051129"),
                    E_OWS.UpperCorner("180 85.051129"),
                    crs="urn:ogc:def:crs:OGC:2:84",
                ),
                E.Style(E_OWS.Identifier(layer.keyname), isDefault="true"),
                E.Format(IMAGE_FORMAT.PNG),
                E.TileMatrixSetLink(E.TileMatrixSet(tile_matrix_id)),
                E.ResourceURL(
                    format=IMAGE_FORMAT.PNG,
                    resourceType="tile",
                    template=tile_url % quote(layer.keyname),
                ),
            )
        )

    tile_matrix_set = E.TileMatrixSet(
        E_OWS.Identifier(tile_matrix_id),
        E_OWS.SupportedCRS("http://www.opengis.net/def/crs/EPSG/0/3857"),
    )
    tile_size = 256
    srs_left, srs_bottom, srs_right, srs_top = BOUNDS_EPSG_3857
    extent_size = srs_right - srs_left
    mpi = 0.00028
    for i in range(25):
        row_size = 2**i
        scale_denom = extent_size / tile_size / row_size / mpi
        tile_matrix_set.append(
            E.TileMatrix(
                E_OWS.Identifier(str(i)),
                E.ScaleDenominator("%.6f" % scale_denom),
                E.TopLeftCorner("%.2f %.2f" % (srs_left, srs_top)),
                E.TileWidth(str(tile_size)),
                E.TileHeight(str(tile_size)),
                E.MatrixWidth(str(row_size)),
                E.MatrixHeight(str(row_size)),
            )
        )
    contents = E.Contents(*layers, tile_matrix_set)

    capabilities = E.Capabilities(
        dict(version="1.0.0"),
        E_OWS.ServiceIdentification(
            E_OWS.Title(obj.display_name),
            E_OWS.ServiceType("OGC WMTS"),
            E_OWS.ServiceTypeVersion("1.0.0"),
        ),
        operations_metadata,
        contents,
    )

    return Response(
        etree.tostring(capabilities, encoding="utf-8"), content_type="text/xml", charset="utf-8"
    )


def _get_wmts_tile(obj, params, request):
    layer = layer_by_keyname(obj, params["LAYER"])
    z = int(params["TILEMATRIX"])
    x = int(params["TILECOL"])
    y = int(params["TILEROW"])

    res = layer.resource
    request.resource_permission(DataScope.read, res)

    srs = SRS.filter_by(id=3857).one()

    req = res.render_request(srs)
    img = req.render_tile((z, x, y), 256)

    if img is None:
        return Response(EMPTY_TILE_256x256, content_type=IMAGE_FORMAT.PNG)

    buf = BytesIO()
    image_encoder_png(img, buf)
    buf.seek(0)

    return Response(body_file=buf, content_type=IMAGE_FORMAT.PNG)


def setup_pyramid(comp, config):
    service_factory = ResourceFactory(context=Service)

    config.add_route(
        "wmsserver.wms",
        "/api/resource/{id}/wms",
        factory=service_factory,
        error_renderer=error_renderer,
        get=wms_handler,
        post=wms_handler,
    )

    config.add_route(
        "wmsserver.wmts_rest",
        "/api/resource/{id}/wms/1.0.0/WMTSCapabilities.xml",
        factory=service_factory,
        error_renderer=error_renderer,
        get=wmts_rest_handler,
    )
