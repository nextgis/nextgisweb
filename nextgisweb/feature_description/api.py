from tempfile import NamedTemporaryFile
from zipfile import ZIP_DEFLATED, ZipFile

from pyramid.response import FileResponse

from nextgisweb.lib.json import dumpb

from nextgisweb.feature_layer import IFeatureLayer
from nextgisweb.resource import DataScope, ResourceFactory

from .model import FeatureDescription


def export(resource, request):
    request.resource_permission(DataScope.read)

    query = FeatureDescription.filter_by(
        resource_id=resource.id,
    ).order_by(FeatureDescription.feature_id)

    metadata = dict()
    metadata_items = metadata["items"] = dict()

    for obj in query:
        metadata_items[f"{obj.feature_id:010d}"] = obj.value

    with NamedTemporaryFile(suffix=".zip") as tmp_file:
        with ZipFile(tmp_file, "w", ZIP_DEFLATED, allowZip64=True) as zipf:
            zipf.writestr("metadata.json", dumpb(metadata))

        response = FileResponse(tmp_file.name, content_type="application/zip")
        response.content_disposition = 'attachment; filename="%d.descriptions.zip"' % resource.id
        return response


def setup_pyramid(comp, config):
    config.add_route(
        "feature_description.export",
        "/api/resource/{id}/feature_description/export",
        factory=ResourceFactory(context=IFeatureLayer),
        get=export,
    )
