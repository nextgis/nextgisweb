# -*- coding: utf-8 -*-
from __future__ import unicode_literals, print_function, absolute_import

import json
from osgeo import osr
from .models import SRS


def collection(request):
    srs_collection = list(map(lambda o: dict(
        id=o.id, display_name=o.display_name,
        auth_name=o.auth_name, auth_srid=o.auth_srid,
        wkt=o.wkt
    ), SRS.query()))
    return sorted(srs_collection, key=lambda srs: srs['id'] != 4326)


def get(request):
    obj = SRS.filter_by(id=request.matchdict['id']).one()
    return dict(
        id=obj.id, display_name=obj.display_name,
        auth_name=obj.auth_name, auth_srid=obj.auth_srid,
        wkt=obj.wkt
    )

def srs_convert(request):
    projStr = request.POST.get('projStr').encode('utf-8')
    wkt = False
    message = ''
    sr = osr.SpatialReference()
    imports = [
        'ImportFromProj4', 
        lambda x: sr.ImportFromEPSG(int(x)), 
        'ImportFromMICoordSys',
        'ImportFromESRI'
    ]

    for i in imports:

        if hasattr(i, '__call__'):
            method_to_call = i
        else:
            method_to_call = getattr(sr, i)

        try:
            if method_to_call and method_to_call(projStr) == 0:
                wkt = sr.ExportToWkt()
                break
        except:
            pass
            
    if not wkt:
        message = 'Invalid SRS definition!'

    return dict(success=bool(wkt), wkt=wkt, message=message)


def setup_pyramid(comp, config):
    config.add_route(
        'spatial_ref_sys.collection', '/api/component/spatial_ref_sys/',
    ).add_view(collection, request_method='GET', renderer='json')

    config.add_route(
        'spatial_ref_sys.get', '/api/component/spatial_ref_sys/{id}',
    ).add_view(get, request_method='GET', renderer='json')

    config.add_route('spatial_ref_sys.convert', '/api/component/spatial_ref_sys/convert/') \
        .add_view(srs_convert, request_method='POST', renderer='json')
