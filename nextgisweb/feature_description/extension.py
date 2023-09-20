from nextgisweb.env import DBSession
from nextgisweb.lib.safehtml import sanitize

from nextgisweb.feature_layer import FeatureExtension

from .model import FeatureDescription


class FeatureDescriptionExtension(FeatureExtension):
    identity = "description"

    editor_widget = "@nextgisweb/feature-description/description-editor"
    display_widget = "ngw-feature-description/DisplayWidget"

    def serialize(self, feature):
        obj = FeatureDescription.filter_by(
            resource_id=self.layer.id, feature_id=feature.id
        ).first()

        if obj is None:
            return None
        else:
            return obj.value

    def deserialize(self, feature, data):
        obj = FeatureDescription.filter_by(
            resource_id=self.layer.id,
            feature_id=feature.id,
        ).first()

        if data is not None:
            data = sanitize(data)

            if obj is None:
                obj = FeatureDescription(
                    resource_id=self.layer.id,
                    feature_id=feature.id,
                ).persist()

            obj.value = data

        elif obj is not None:
            DBSession.delete(obj)
