from sqlalchemy import distinct, func

from ..feature_layer import FeatureExtension
from ..models import DBSession

from .model import FeatureAttachment


@FeatureExtension.registry.register
class FeatureAttachmentExtension(FeatureExtension):
    identity = 'attachment'

    editor_widget = "ngw-feature-attachment/EditorWidget"
    display_widget = "ngw-feature-attachment/DisplayWidget"

    def count(self):
        return DBSession.query(
            func.count(distinct(FeatureAttachment.feature_id))
        ).filter(
            FeatureAttachment.resource_id == self.layer.id
        ).scalar()

    def bulk_serialize(self, features):
        fid_index = dict()
        for i, feature in enumerate(features):
            fid_index[feature.id] = i

        fid_found = set()
        data = [None] * len(features)

        for itm in FeatureAttachment.filter(
            FeatureAttachment.resource_id == self.layer.id,
            FeatureAttachment.feature_id.in_(fid_index.keys()),
        ):
            if itm.feature_id not in fid_found:
                fid_found.add(itm.feature_id)

            idx = fid_index[itm.feature_id]
            if data[idx] is None:
                data[idx] = []
            data[idx].append(itm.serialize())

        return len(fid_found), data

    def serialize(self, feature):
        query = FeatureAttachment.filter_by(
            resource_id=self.layer.id,
            feature_id=feature.id)

        result = list(map(lambda itm: itm.serialize(), query))
        return result if len(result) > 0 else None

    def deserialize(self, feature, data):
        if data is None:
            data = []

        rest = dict()
        for fa in FeatureAttachment.filter_by(
            resource_id=feature.layer.id,
            feature_id=feature.id
        ):
            rest[fa.id] = fa

        for itm in data:
            if 'id' in itm:
                obj = rest[itm['id']]
                del rest[itm['id']]

            else:
                obj = FeatureAttachment(
                    resource_id=feature.layer.id,
                    feature_id=feature.id
                ).persist()

            obj.deserialize(itm)

        for fa in rest.values():
            DBSession.delete(fa)
