from io import BytesIO
from typing import Union

import sqlalchemy as sa
import sqlalchemy.orm as orm
from PIL import Image

from nextgisweb.env import COMP_ID, Base

from nextgisweb.file_storage import FileObj
from nextgisweb.file_upload import FileUploadRef
from nextgisweb.resource import Resource, ResourceScope, SAttribute, Serializer

Base.depends_on("resource")

MAX_SIZE = (1600, 630)


class ResourceSocial(Base):
    __tablename__ = "resource_social"

    resource_id = sa.Column(sa.ForeignKey(Resource.id), primary_key=True)
    preview_fileobj_id = sa.Column(sa.ForeignKey(FileObj.id))
    preview_description = sa.Column(sa.Unicode)

    resource = orm.relationship(
        Resource,
        backref=orm.backref(
            "social",
            cascade="all, delete-orphan",
            uselist=False,
        ),
    )
    preview_fileobj = orm.relationship(FileObj, lazy="joined")


class FileUploadAttr(SAttribute, apitype=True):
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


class ImageExistsAttr(SAttribute, apitype=True):
    def get(self, srlzr) -> bool:
        social = srlzr.obj.social
        return social is not None and social.preview_fileobj_id is not None


class DescriptionAttr(SAttribute, apitype=True):
    def get(self, srlzr) -> Union[str, None]:
        social = srlzr.obj.social
        return social.preview_description if social is not None else None

    def set(self, srlzr, value: Union[str, None], *, create: bool):
        if srlzr.obj.social is None:
            srlzr.obj.social = ResourceSocial()
        srlzr.obj.social.preview_description = value


class SocialSerializer(Serializer, resource=Resource):
    identity = COMP_ID

    file_upload = FileUploadAttr(write=ResourceScope.update)
    image_exists = ImageExistsAttr(read=ResourceScope.read)
    description = DescriptionAttr(read=ResourceScope.read, write=ResourceScope.update)
