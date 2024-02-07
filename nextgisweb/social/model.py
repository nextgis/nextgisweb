from io import BytesIO

from PIL import Image

from nextgisweb.env import COMP_ID, Base
from nextgisweb.lib import db

from nextgisweb.file_storage import FileObj
from nextgisweb.file_upload import FileUpload
from nextgisweb.resource import Resource, ResourceScope, Serializer
from nextgisweb.resource import SerializedProperty as SP

Base.depends_on("resource")

MAX_SIZE = (1600, 630)


class ResourceSocial(Base):
    __tablename__ = "resource_social"

    resource_id = db.Column(db.ForeignKey(Resource.id), primary_key=True)
    preview_fileobj_id = db.Column(db.ForeignKey(FileObj.id))
    preview_description = db.Column(db.Unicode)

    resource = db.relationship(
        Resource,
        backref=db.backref(
            "social",
            cascade="all, delete-orphan",
            uselist=False,
        ),
    )
    preview_fileobj = db.relationship(FileObj, lazy="joined")


class _preview_file_upload_attr(SP):
    def setter(self, srlzr, value):
        if srlzr.obj.social is None:
            srlzr.obj.social = ResourceSocial()

        social = srlzr.obj.social
        if value is not None:
            fupload = FileUpload(id=value["id"])
            with Image.open(fupload.data_path) as image:
                width, height = image.size
                resize = width > MAX_SIZE[0] or height > MAX_SIZE[1]
                if image.format != "PNG" or resize:
                    if resize:
                        image.thumbnail(MAX_SIZE)
                    buf = BytesIO()
                    image.save(buf, "png", optimize=True)
                    social.preview_fileobj = FileObj().from_content(buf.getvalue())
                else:
                    social.preview_fileobj = fupload.to_fileobj()

        elif social.preview_fileobj is not None:
            social.preview_fileobj = None


class _preview_image_exists(SP):
    def getter(self, srlzr):
        social = srlzr.obj.social
        return social is not None and social.preview_fileobj_id is not None


class _preview_description_attr(SP):
    def getter(self, srlzr):
        social = srlzr.obj.social
        return social.preview_description if social is not None else None

    def setter(self, srlzr, value):
        if srlzr.obj.social is None:
            srlzr.obj.social = ResourceSocial()
        srlzr.obj.social.preview_description = value


class SocialSerializer(Serializer):
    identity = COMP_ID
    resclass = Resource

    preview_file_upload = _preview_file_upload_attr(write=ResourceScope.update)
    preview_image_exists = _preview_image_exists(read=ResourceScope.read)
    preview_description = _preview_description_attr(
        read=ResourceScope.read,
        write=ResourceScope.update,
    )
