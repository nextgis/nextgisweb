import sqlalchemy as sa

from nextgisweb.lib.safehtml import sanitize

from nextgisweb.feature_layer import FeatureExtension

from .model import FeatureDescription as Description


class FeatureDescriptionExtension(FeatureExtension):
    identity = "description"

    def serialize(self, feature, *, version=None):
        filter_by = dict(resource_id=self.layer.id, feature_id=feature.id)
        if version is None:
            obj = Description.filter_by(**filter_by).first()
            return obj.value if obj else None
        else:
            session = sa.inspect(self.layer).session
            query = Description.fversioning_queries.feature_pit
            params = dict(p_rid=self.layer.id, p_fid=feature.id, p_vid=version)
            if row := session.execute(query, params).one_or_none():
                return dict(version=row.version_id, value=row.value)

    def deserialize(self, feature, data):
        obj = Description.filter_by(
            resource_id=self.layer.id,
            feature_id=feature.id,
        ).first()

        if data is not None:
            if obj:
                # TODO: Sanitize existing data, this keeps unsanitized data!
                if obj.value != data and obj.value != (sntzd := sanitize(data)):
                    obj.value = sntzd
                    return True
                return False
            else:
                obj = Description(
                    resource=self.layer,
                    feature_id=feature.id,
                ).persist()
                obj.value = sanitize(data)
                return True
        elif obj:
            obj.delete()
            return True
        return False
