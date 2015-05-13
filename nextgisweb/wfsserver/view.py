# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from pyramid.response import Response

from ..resource import Widget, resource_factory, Resource
from .model import Service

from .third_party.FeatureServer.Server import Server, FeatureServerException
from .third_party.web_request.response import Response as FeatureserverResponse

from nextgis_to_fs import NextgiswebDatasource


NS_XLINK = 'http://www.w3.org/1999/xlink'


class ServiceWidget(Widget):
    resource = Service
    operation = ('create', 'update')
    amdmod = 'ngw-wfsserver/ServiceWidget'


def handler(obj, request):
    if request.params.get('SERVICE') != 'WFS':
        return

    req = request.params.get('REQUEST')
    post_data = request.body
    request_method = request.method

    params = {
        'service': request.params.get('SERVICE'),
        'request': req,
        'typename': request.params.get('TYPENAME'),
        'srsname': request.params.get('SRSNAME'),
        'version': request.params.get('VERSION'),
        'maxfeatures': request.params.get('MAXFEATURES'),
        'startfeature': request.params.get('STARTFEATURE'),
        'filter': request.params.get('FILTER'),
        'format': request.params.get('OUTPUTFORMAT'),
    }
    # None values can cause parsing errors in featureserver. So delete 'Nones':
    params = {key:params[key] for key in params if params[key] is not None}

    datasources = {l.keyname: NextgiswebDatasource(l.keyname,
        layer=l.resource,
        title=l.display_name) for l in obj.layers
    }
    sourcenames = '/'.join([sourcename for sourcename in datasources])

    server = Server(datasources)
    base_path = request.path_url

    try:
        result = server.dispatchRequest(base_path=base_path,
                                    path_info='/'+sourcenames, params=params,
                                    post_data=post_data,
                                    request_method=request_method)
    except FeatureServerException as e:
        data = e.data
        content_type = e.mime
        return Response(data, content_type=content_type)

    # Отправляем результат обработки

    if isinstance(result, tuple):
        # ответ на запросы req.lower() in ['getcapabilities', 'describefeaturetype']
        content_type, resxml = result
        resp = Response(resxml, content_type=content_type)
        return resp
    elif isinstance(result, FeatureserverResponse):
        # ответ на запрос GetFeature, Update, Insert, Delete
        data = result.getData()
        return Response(data, content_type=result.content_type)


def setup_pyramid(comp, config):

    config.add_route(
        'wfsserver.wfs', '/resource/{id:\d+}/wfs',
        factory=resource_factory, client=('id',)
    ).add_view(handler, context=Service)


    Resource.__psection__.register(
        key='wfsserver', priority=50,
        title="Сервис WFS",
        is_applicable=lambda obj: obj.cls == 'wfsserver_service',
        template='nextgisweb:wfsserver/template/section.mako')
