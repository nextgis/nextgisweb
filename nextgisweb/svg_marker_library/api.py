# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

from os import path

import zipstream
from pyramid.httpexceptions import HTTPNotFound
from pyramid.response import FileResponse, Response

from ..compat import lru_cache
from ..env import env
from ..resource import DataScope

from .model import SVGMarkerLibrary, validate_filename


def file_download(resource, request):
    request.resource_permission(DataScope.read)

    fname = request.matchdict['name']
    svg_marker = resource.find_svg_marker(fname)

    if svg_marker is None:
        raise HTTPNotFound()

    return FileResponse(svg_marker.path, content_type='image/svg+xml', request=request)


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


@lru_cache(maxsize=256)
def lookup_marker(name, library_id=None):
    validate_filename(name)

    if library_id is not None:
        library = SVGMarkerLibrary.filter_by(id=library_id).one()
        svg_marker = library.find_svg_marker(name)
        if svg_marker is not None:
            return svg_marker.path

    name = name + '.svg'
    for svg_dir in env.svg_marker_library.options['svg_paths']:
        candidate = path.join(svg_dir, name)
        if path.isfile(candidate):
            return candidate

    return None


def setup_pyramid(comp, config):
    comp.lookup_marker = lookup_marker

    config.add_view(
        file_download, route_name='resource.file_download',
        context=SVGMarkerLibrary, request_method='GET'
    )

    config.add_view(
        export, route_name='resource.export', context=SVGMarkerLibrary, request_method='GET'
    )
