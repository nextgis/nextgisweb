from tempfile import NamedTemporaryFile
from zipfile import ZIP_DEFLATED, ZipFile

from lxml import etree, html
from pyramid.response import FileResponse

from nextgisweb.feature_layer import IFeatureLayer
from nextgisweb.feature_layer.api import versioning
from nextgisweb.file_upload import FileUpload
from nextgisweb.pyramid import JSONType
from nextgisweb.resource import DataScope, ResourceFactory

from .api_import import descriptions_import
from .model import FeatureDescription


def export(resource, request):
    request.resource_permission(DataScope.read)

    query = FeatureDescription.filter_by(
        resource_id=resource.id,
    ).order_by(FeatureDescription.feature_id)

    root = html.Element("html")
    body = etree.SubElement(root, "body")

    with NamedTemporaryFile(suffix=".zip") as tmp_file:
        with ZipFile(tmp_file, "w", ZIP_DEFLATED, allowZip64=True) as zipf:
            for obj in query:
                filename = f"{obj.feature_id:010d}.html"
                elements = html.fragments_fromstring(obj.value)
                for element in elements:
                    if isinstance(element, str):
                        if body.text is None:
                            body.text = element
                        else:
                            body.text += element
                    else:
                        body.append(element)
                content = html.tostring(root, encoding="utf-8")
                body.clear()
                zipf.writestr(filename, content)

        response = FileResponse(tmp_file.name, content_type="application/zip")
        response.content_disposition = 'attachment; filename="%d.descriptions.zip"' % resource.id
        return response


def import_description(resource, request) -> JSONType:
    """Import feature descriptions

    :returns: Feature descriptions imported successfully"""
    request.resource_permission(DataScope.write)

    data = request.json_body
    replace = data.get("replace", False) is True
    fupload = FileUpload(id=data["source"]["id"])
    with versioning(resource, request):
        return descriptions_import(resource, fupload.data_path, replace=replace)


def setup_pyramid(comp, config):
    feature_layer_factory = ResourceFactory(context=IFeatureLayer)

    config.add_route(
        "feature_description.export",
        "/api/resource/{id}/feature_description/export",
        factory=feature_layer_factory,
        get=export,
    )

    config.add_route(
        "feature_description.import",
        "/api/resource/{id}/feature_description/import",
        factory=feature_layer_factory,
        put=import_description,
    )
