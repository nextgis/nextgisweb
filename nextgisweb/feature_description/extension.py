from sqlalchemy import func

from ..feature_layer import FeatureExtension
from ..models import DBSession

from .model import FeatureDescription


@FeatureExtension.registry.register
class FeatureDescriptionExtension(FeatureExtension):
    identity = 'description'

    editor_widget = 'ngw-feature-description/EditorWidget'
    display_widget = 'ngw-feature-description/DisplayWidget'

    def count(self):
        return DBSession.query(
            func.count(FeatureDescription.feature_id)
        ).filter(
            FeatureDescription.resource_id == self.layer.id
        ).scalar()

    def bulk_serialize(self, features):
        fid_index = dict()
        for i, feature in enumerate(features):
            fid_index[feature.id] = i

        fid_found = set()
        data = [None] * len(features)

        for itm in FeatureDescription.filter(
            FeatureDescription.resource_id == self.layer.id,
            FeatureDescription.feature_id.in_(fid_index.keys()),
        ):
            if itm.feature_id not in fid_found:
                fid_found.add(itm.feature_id)

            idx = fid_index[itm.feature_id]
            data[idx] = itm.value

        return len(fid_found), data

    def deserialize(self, feature, data):
        obj = FeatureDescription.filter_by(
            resource_id=self.layer.id,
            feature_id=feature.id
        ).first()

        if obj is None:
            if data is not None:
                obj = FeatureDescription(
                    resource_id=self.layer.id,
                    feature_id=feature.id,
                    value=data)
                obj.persist()

        else:
            if data is None:
                DBSession.delete(obj)
            else:
                obj.value = data
