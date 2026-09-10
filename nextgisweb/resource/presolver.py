from __future__ import annotations

from collections import defaultdict
from collections.abc import Generator, Iterable
from typing import Final, NamedTuple, cast

from nextgisweb.auth import User

from .model import Resource, ResourceACLRule
from .permission import Permission


class ExplainDefault(NamedTuple):
    result: bool
    resource: Resource


class ExplainACLRule(NamedTuple):
    result: bool
    resource: Resource
    acl_rule: ResourceACLRule


class ExplainRequirement(NamedTuple):
    result: bool
    resource: Resource | None
    requirement: object
    satisfied: bool
    resolver: PermissionResolver | None


class PermissionResolver:
    def __init__(
        self,
        resource: Resource,
        *,
        user: User,
        permissions: Iterable[Permission] | None = None,
        explain: bool = False,
    ) -> None:
        self.resource: Final = resource
        self.user: Final = user
        self.permissions: Final = permissions
        self.explain: Final = explain

        req_list = resource.class_requirements()

        # Directly requested permissions
        perm_req = set(permissions if (permissions is not None) else resource.class_permissions())

        # Additional permissions required by directly requested
        perm_all = set(perm_req)

        # Expand result with permissions required by requested
        if permissions is not None:
            for req in reversed(req_list):
                if req.attr is None and req.dst in perm_all and req.src not in perm_all:
                    perm_all.add(req.src)

            if __debug__:
                for req in req_list:
                    if req.attr is None and req.dst in perm_all and req.src not in perm_all:
                        assert False, "Permission %r is missing in permissions" % req.src

        perm_rest = set(perm_req)

        result = self._result = {perm: cast(bool | None, None) for perm in perm_all}
        explanation = self._explanation = {perm: [] for perm in perm_all} if explain else None

        for perm, rule in _acl_rules(resource, user, perm_all):
            if rule.action == "allow":
                result[perm] = result[perm] in (None, True)
            elif rule.action == "deny":
                result[perm] = False
                perm_rest.remove(perm)
            else:
                raise NotImplementedError

            if explanation is not None:
                rule_result = result[perm]
                assert rule_result is not None
                explanation[perm].append(ExplainACLRule(rule_result, rule.resource, rule))

        for perm, value in result.items():
            if value is None:
                result[perm] = False
                perm_rest.remove(perm)
                if explanation:
                    explanation[perm].append(ExplainDefault(False, resource))

        if len(perm_rest) == 0:
            return

        req_list = tuple(filter(lambda req: result.get(req.dst) is True, req_list))

        # Apply requirement dependencies

        if __debug__:
            dependencies = defaultdict(set)
            for req in req_list:
                dependencies[req.dst].add(req)

        for req in req_list:
            req_dst, req_src = req.dst, req.src
            if req.attr is None:
                assert len(dependencies[req_src]) == 0, (
                    f"{req} evaluated before {dependencies[req_src]}"
                )
                req_satisfied = result[req_src] is True
                if not req_satisfied:
                    result[req_dst] = False
                    perm_rest.remove(req_dst)
                if explanation:
                    req_result = result[req_dst]
                    assert req_result is not None
                    explanation[req_dst].append(
                        ExplainRequirement(req_result, resource, req, req_satisfied, None)
                    )
            else:
                attrval = getattr(resource, req.attr)
                if attrval is None:
                    if not req.attr_empty:
                        result[req_dst] = False
                        perm_rest.remove(req_dst)
                    if explanation:
                        req_result = result[req_dst]
                        assert req_result is not None
                        explanation[req_dst].append(
                            ExplainRequirement(req_result, None, req, not req.attr_empty, None)
                        )
                else:
                    attr_resolver = PermissionResolver(
                        attrval,
                        user=user,
                        permissions=(req_src,),
                        explain=explain,
                    )

                    req_satisfied = attr_resolver._result[req_src] is True

                    if not req_satisfied:
                        result[req_dst] = False
                        perm_rest.remove(req_dst)
                    if explanation:
                        req_result = result[req_dst]
                        assert req_result is not None
                        explanation[req_dst].append(
                            ExplainRequirement(
                                req_result, attrval, req, req_satisfied, attr_resolver
                            )
                        )

            if __debug__:
                dependencies[req_dst].remove(req)


def _acl_rules(
    resource: Resource,
    user: User,
    permissions: Iterable[Permission],
) -> Generator[tuple[Permission, ResourceACLRule], None, None]:
    for res in tuple(resource.parents) + (resource,):
        rules = filter(
            lambda rule: (
                (rule.propagate or res == resource)
                and rule.cmp_identity(resource.identity)
                and rule.cmp_user(user)
            ),
            res.acl,
        )

        for rule in rules:
            for perm in permissions:
                if rule.cmp_permission(perm):
                    yield perm, rule
