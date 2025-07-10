from types import SimpleNamespace
from typing import List, Literal, Union

from msgspec import UNSET, Struct, UnsetType

from nextgisweb.lib import dynmenu as dm

from nextgisweb.resource import ResourceCls

from .scope import ResourceScope


class ResourceChildAction(Struct, kw_only=True):
    href: str
    target: Union[Literal["_self", "_blank"], UnsetType] = UNSET
    title: str
    icon: str
    key: List[str]


class ResourceChildItem(Struct, kw_only=True):
    id: int
    displayName: str
    cls: ResourceCls
    clsDisplayName: Union[str, UnsetType] = UNSET
    creationDate: Union[str, UnsetType] = UNSET
    ownerUserDisplayName: Union[str, UnsetType] = UNSET
    actions: List[ResourceChildAction]


class ResourceChildrenList(Struct, kw_only=True):
    children: List[ResourceChildItem]


def build_children_payload(obj, request) -> List[ResourceChildItem]:
    tr = request.localizer.translate

    resources = [
        resource
        for resource in obj.children
        if (ResourceScope.read in resource.permissions(request.user))
    ]

    resources.sort(key=lambda res: (res.cls_order, res.display_name))

    payload: List[ResourceChildItem] = list()
    for item in resources:
        iacts: List[ResourceChildAction] = list()
        idata = ResourceChildItem(
            id=item.id,
            displayName=item.display_name,
            cls=item.cls,
            clsDisplayName=tr(item.cls_display_name),
            creationDate=item.creation_date,
            ownerUserDisplayName=tr(item.owner_user.display_name_i18n),
            actions=iacts,
        )
        args = SimpleNamespace(obj=item, request=request)
        for menu_item in item.__dynmenu__.build(args):
            if (
                isinstance(menu_item, dm.Link)
                and menu_item.important
                and menu_item.icon is not None
            ):
                iacts.append(
                    ResourceChildAction(
                        href=menu_item.url(args),
                        target=menu_item.target,
                        title=tr(menu_item.label),
                        icon=menu_item.icon,
                        key=menu_item.key,
                    )
                )

        payload.append(idata)
    return payload
