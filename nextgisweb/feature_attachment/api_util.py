from typing import Annotated

from msgspec import UNSET, Meta, Struct, UnsetType

from nextgisweb.feature_layer.api import FeatureID

AttachmentID = Annotated[int, Meta(description="Attachment ID")]


class MetadataItem(Struct):
    feature_id: FeatureID
    name: str | None | UnsetType = UNSET
    mime_type: str | None | UnsetType = UNSET
    keyname: str | None | UnsetType = UNSET
    description: str | None | UnsetType = UNSET
    id: AttachmentID | UnsetType = UNSET


class Metadata(Struct):
    items: dict[
        Annotated[str, Meta(examples=["0000000003/photo.jpg"])],
        MetadataItem,
    ]
