from nextgisweb.env import gettext, inject
from nextgisweb.lib.apitype import Gap

from ..component import ResourceComponent
from ..event import OnChildClasses
from ..model import Resource, ResourceCls, ResourceRef
from ..permission import Scope
from ..scope import ResourceScope
from .base import ResourceAttr


class ResourceAttrParent(ResourceAttr, tag="resource.parent"):
    def __call__(self, obj, *, ctx) -> ResourceRef | None:
        return ResourceRef(id=obj.parent_id) if obj.parent_id is not None else None


class ResourceAttrParents(ResourceAttr, tag="resource.parents"):
    def __call__(self, obj, *, ctx) -> list[ResourceRef]:
        result: list[ResourceRef] = []
        parent = obj.parent
        while parent is not None:
            result.insert(0, ResourceRef(id=parent.id))
            parent = parent.parent
        return result


ResourcePermissionGap = Gap("ResourcePermissionGap", str)


class ResourceAttrHasPermission(ResourceAttr, tag="resource.has_permission"):
    permission: ResourcePermissionGap

    def __call__(self, obj, *, ctx) -> bool:
        scope_identity, permission_identity = self.permission.split(".", 1)
        permission = getattr(Scope.registry[scope_identity], permission_identity)
        return obj.has_permission(permission, user=ctx.user)


class ResourceAttrChildrenCreatable(ResourceAttr, tag="resource.children_creatable"):
    def __call__(self, obj, *, ctx) -> list[ResourceCls]:
        if ResourceScope.manage_children not in obj.permissions(ctx.user):
            return []

        disabled = self._disabled()
        classes = set(
            cls
            for cls in Resource.registry.values()
            if (cls.identity not in disabled and cls.check_parent(obj))
        )

        if len(classes) == 0:
            return []

        classes = OnChildClasses.apply(parent=obj, classes=classes)

        result: list[ResourceCls] = []
        for cls in classes:
            # Create a temporary resource to perform the remaining checks
            # TODO: It shouldn't be added to a session! Double-check it.
            child = cls(parent=obj, owner_user=ctx.user)
            try:
                if not obj.check_child(child):
                    continue
                if not child.has_permission(ResourceScope.create, ctx.user):
                    continue
            finally:
                # Workaround SAWarning: Object of type ... not in session, add
                # operation along 'Resource.children' will not proceed
                child.parent = None

            result.append(cls.identity)  # type: ignore

        return result

    @classmethod
    @inject()
    def _disabled(cls, *, comp: ResourceComponent) -> set[ResourceCls]:
        return set(comp.disabled_resource_cls)


class ResourceAttrIsDeletable(ResourceAttr, tag="resource.is_deletable"):
    def __call__(self, obj, *, ctx) -> bool:
        return obj.permissions(ctx.user).issuperset(
            {ResourceScope.delete, ResourceScope.manage_children},
        )


class ResourceAttrSummary(ResourceAttr, tag="resource.summary"):
    def __call__(self, obj, *, ctx) -> list[tuple[str, str]]:
        tr = ctx.translate
        result: list[tuple[str, str]] = []

        if obj.id != 0:
            result.append((tr(gettext("Resource ID")), str(obj.id)))

        result.append((tr(gettext("Type")), f"{tr(obj.cls_display_name)} ({obj.cls})"))

        if keyname := obj.keyname:
            result.append((tr(gettext("Keyname")), keyname))

        if get_info := getattr(obj, "get_info", None):
            for key, value in get_info():
                if isinstance(value, bool):
                    value = gettext("Yes") if value else gettext("No")
                result.append((tr(key), str(tr(value))))

        result.append((tr(gettext("Owner")), tr(obj.owner_user.display_name_i18n)))

        return result
