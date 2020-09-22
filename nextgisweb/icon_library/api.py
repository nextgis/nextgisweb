# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

import zipstream

from pyramid.httpexceptions import HTTPNotFound
from pyramid.response import FileResponse, Response

from ..resource import DataScope

from .model import SVGSymbolLibrary


def file_download(resource, request):
    request.resource_permission(DataScope.read)

    fname = request.matchdict['name']
    svg_symbol = resource.find_svg_symbol(fname)

    if svg_symbol is None:
        raise HTTPNotFound()

    return FileResponse(svg_symbol.path, content_type='image/svg+xml', request=request)


def export(resource, request):
    request.resource_permission(DataScope.read)

    zip_stream = zipstream.ZipFile(mode='w', compression=zipstream.ZIP_DEFLATED, allowZip64=True)
    for f in resource.files:
        zip_stream.write(f.path, arcname=f.name)

    return Response(
        app_iter=zip_stream,
        content_type='application/zip',
        content_disposition='attachment; filename="%d.zip"' % resource.id,
    )


def setup_pyramid(comp, config):
    config.add_view(
        file_download, route_name='resource.file_download',
        context=SVGSymbolLibrary, request_method='GET'
    )

    config.add_view(
        export, route_name='resource.export', context=SVGSymbolLibrary, request_method='GET'
    )
