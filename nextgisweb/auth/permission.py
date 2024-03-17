from __future__ import annotations

from typing import ClassVar, Dict, Literal, Union

from nextgisweb.env import gettext
from nextgisweb.env.package import pkginfo
from nextgisweb.lib.i18n import Translatable, TrStr
from nextgisweb.lib.imptool import module_from_stack

WellKnownSuffix = Literal["view", "manage"]
WellKnownLabel: Dict[WellKnownSuffix, Translatable] = {
    "view": gettext("View"),
    "manage": gettext("Manage"),
}


class Permission:
    identity: str
    label: Translatable

    registry: ClassVar[Dict[str, Permission]] = dict()

    def __init__(
        self,
        name: str,
        label: Translatable,
        suffix: Union[WellKnownSuffix, None] = None,
    ) -> None:
        mod = module_from_stack(skip=(__name__,))
        cid = pkginfo.component_by_module(mod)
        self.identity = f"{cid}.{name}"
        if suffix is not None:
            assert isinstance(label, TrStr)
            label = label + ": " + WellKnownLabel[suffix]
        self.label = label
        self.registry[self.identity] = self


_msg_groups_and_users = gettext("Groups and users")
view = Permission("view", _msg_groups_and_users, "view")
manage = Permission("manage", _msg_groups_and_users, "manage")
auth = (view, manage)
