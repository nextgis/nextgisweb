from nextgisweb.env import Base
from nextgisweb.lib import db

from nextgisweb.resource import Resource

Base.depends_on("resource", "feature_layer")


class FeatureDescription(Base):
    __tablename__ = "feature_description"

    resource_id = db.Column(db.ForeignKey(Resource.id), primary_key=True)
    feature_id = db.Column(db.Integer, primary_key=True)
    value = db.Column(db.Unicode, nullable=False)

    resource = db.relationship(
        Resource,
        backref=db.backref(
            "_backref_feature_description",
            cascade="all",
            cascade_backrefs=False,
        ),
    )
