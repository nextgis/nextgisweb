from io import BytesIO
from typing import Union

from PIL import Image

from nextgisweb.env import COMP_ID, Base
from nextgisweb.lib import db

from nextgisweb.file_storage import FileObj
from nextgisweb.file_upload import FileUploadRef
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


class FileUploadAttr(SP, apitype=True):
    def set(self, srlzr, value: Union[FileUploadRef, None], *, create: bool):
        if srlzr.obj.social is None:
            srlzr.obj.social = ResourceSocial()

        social = srlzr.obj.social
        if value is not None:
            fupload = value()
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


class ImageExistsAttr(SP, apitype=True):
    def get(self, srlzr) -> bool:
        social = srlzr.obj.social
        return social is not None and social.preview_fileobj_id is not None


class DescriptionAttr(SP, apitype=True):
    def get(self, srlzr) -> Union[str, None]:
        social = srlzr.obj.social
        return social.preview_description if social is not None else None

    def set(self, srlzr, value: Union[str, None], *, create: bool):
        if srlzr.obj.social is None:
            srlzr.obj.social = ResourceSocial()
        srlzr.obj.social.preview_description = value


class SocialSerializer(Serializer, apitype=True):
    identity = COMP_ID
    resclass = Resource

    preview_file_upload = FileUploadAttr(write=ResourceScope.update)
    preview_image_exists = ImageExistsAttr(read=ResourceScope.read)
    preview_description = DescriptionAttr(read=ResourceScope.read, write=ResourceScope.update)
