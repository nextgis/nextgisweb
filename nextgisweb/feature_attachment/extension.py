from typing import Any

import sqlalchemy as sa

from nextgisweb.feature_layer import FeatureExtension

from .model import FeatureAttachment as Attachment


class FeatureAttachmentExtension(FeatureExtension):
    identity = "attachment"

    editor_widget = "@nextgisweb/feature-attachment/attachment-editor"
    display_widget = "ngw-feature-attachment/DisplayWidget"

    def serialize(self, feature, *, version=None) -> Any:
        session = sa.inspect(self.layer).session
        filter_by = dict(resource_id=self.layer.id, feature_id=feature.id)
        if version is None:
            query = Attachment.filter_by(**filter_by)
            itm = list(map(lambda itm: itm.serialize(), query))
            return itm if len(itm) > 0 else None
        else:
            result = []
            query = Attachment.fversioning_queries.feature_pit
            params = dict(p_rid=self.layer.id, p_fid=feature.id, p_vid=version)
            qresult = session.execute(query, params)
            for mid, vid, fileobj_id, keyname, name, mime_type, description in qresult:
                itm = dict(id=mid, version=vid, fileobj=dict(id=fileobj_id))
                if keyname is not None:
                    itm["keyname"] = keyname
                if name is not None:
                    itm["name"] = name
                if mime_type is not None:
                    itm["mime_type"] = mime_type
                if description is not None:
                    itm["description"] = description
                result.append(itm)

            return result if result else None

    def deserialize(self, feature, data) -> bool:
        updated = False
        if data is None:
            data = []

        rest = dict()
        for fa in Attachment.filter_by(
            resource_id=self.layer.id,
            feature_id=feature.id,
        ):
            rest[fa.id] = fa

        for itm in data:
            if "id" in itm:
                obj = rest[itm["id"]]
                del rest[itm["id"]]
            else:
                obj = Attachment(
                    resource=self.layer,
                    feature_id=feature.id,
                ).persist()

            if obj.deserialize(itm):
                updated = True

        for fa in rest.values():
            fa.delete()
            updated = True

        return updated
