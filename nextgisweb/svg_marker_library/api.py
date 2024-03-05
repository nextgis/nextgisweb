import zipstream
from msgspec import Meta
from pyramid.httpexceptions import HTTPNotFound
from pyramid.response import FileResponse, Response
from typing_extensions import Annotated

from nextgisweb.lib.apitype import ContentType

from nextgisweb.resource import ResourceScope

from .model import SVGMarkerLibrary


def file_download(
    resource,
    request,
    name: Annotated[str, Meta(description="Marker name")],
) -> Annotated[Response, ContentType("image/svg+xml")]:
    """Download marker SVG file"""
    request.resource_permission(ResourceScope.read)

    if (svg_marker := resource.find_svg_marker(name)) is None:
        raise HTTPNotFound()
    return FileResponse(svg_marker.path, content_type="image/svg+xml", request=request)


def export(resource, request) -> Annotated[Response, ContentType("application/zip")]:
    """Export library as ZIP archive"""
    request.resource_permission(ResourceScope.read)

    zip_stream = zipstream.ZipFile(mode="w", compression=zipstream.ZIP_DEFLATED, allowZip64=True)
    for f in resource.files:
        zip_stream.write(f.path, arcname="%s.svg" % f.name)

    return Response(
        app_iter=zip_stream,
        content_type="application/zip",
        content_disposition='attachment; filename="%d.zip"' % resource.id,
        request=request,
    )


def setup_pyramid(comp, config):
    config.add_view(
        file_download,
        route_name="resource.file_download",
        context=SVGMarkerLibrary,
        request_method="GET",
    )

    config.add_view(
        export,
        route_name="resource.export",
        context=SVGMarkerLibrary,
        request_method="GET",
    )
