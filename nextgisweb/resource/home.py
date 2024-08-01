import re
from typing import Union

from sqlalchemy import BigInteger, func, select

from nextgisweb.env import DBSession, env, gettext

from nextgisweb.auth import OnUserLogin, User

from .model import ResourceACLRule, ResourceGroup


def parent_group(create=False) -> Union[ResourceGroup, None]:
    comp = env.resource
    res = ResourceGroup.filter_by(keyname=comp.options["home.keyname"]).first()

    if res is None and create:
        translate = env.core.localizer().translate
        res = ResourceGroup(
            parent_id=0,
            keyname=comp.options["home.keyname"],
            owner_user=User.filter_by(keyname="administrator").one(),
            display_name=translate(gettext("User resources")),
        )
        res.acl.append(
            ResourceACLRule(
                action="allow",
                propagate=False,
                principal=User.filter_by(keyname="authenticated").one(),
                scope="resource",
                permission="read",
            )
        )
        res.persist()
        DBSession.flush()

    return res


def user_group(user, create=False) -> Union[ResourceGroup, None]:
    if (parent := parent_group()) is None:
        return None

    if groups := env.resource.options["home.groups"]:
        for g in user.member_of:
            if g.keyname in groups:
                break
        else:
            return None

    res = ResourceGroup.filter_by(
        owner_user_id=user.id,
        parent_id=parent.id,
    ).first()

    if res is None and create:
        pattern = r"^" + re.escape(user.display_name) + r"( \d+)?$"
        qseq = select(
            func.max(
                func.coalesce(
                    func.substring(ResourceGroup.display_name, r"\d+$").cast(BigInteger), 1
                )
            )
        )
        qseq = qseq.filter(ResourceGroup.parent_id == parent.id)
        qseq = qseq.filter(ResourceGroup.display_name.regexp_match(pattern))
        seq_num = DBSession.execute(qseq).scalar()

        display_name = user.display_name
        if seq_num is not None:
            display_name += " " + str(seq_num + 1)

        res = ResourceGroup(
            parent_id=parent.id,
            owner_user_id=user.id,
            display_name=display_name,
        )

        res.acl.append(
            ResourceACLRule(
                action="allow",
                propagate=True,
                principal=user,
            )
        )

        res.persist()
        DBSession.flush()

    return res


def on_user_login(event: OnUserLogin):
    if not env.resource.options["home.enabled"]:
        return

    if (res := user_group(event.user, create=True)) is None:
        return

    event.next_url = event.request.route_url("resource.show", id=res.id)
