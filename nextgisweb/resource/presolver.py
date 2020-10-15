# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals
from collections import defaultdict, namedtuple

from .permission import RequirementList


ExplainDefault = namedtuple('ExplainDefault', ['result', 'resource'])
ExplainACLRule = namedtuple('ExplainACLRule', ['result', 'resource', 'acl_rule'])
ExplainRequirement = namedtuple('ExplainRequirement', [
    'result', 'resource', 'requirement', 'satisfied', 'resolver'])


class PermissionResolver(object):

    def __init__(self, resource, user, permissions=None, explain=False):
        self._resource = resource
        self._user = user
        self._permissions = permissions
        self._explain = explain

        self._solve(resource, user, permissions, explain)

    @property
    def resource(self):
        return self._resource

    def _solve(self, resource, user, permissions, explain):
        req_list = _resource_requirements(resource)

        # Directly requested permissions
        perm_req = set(permissions if (permissions is not None) else resource.class_permissions())

        # Additional permissions required by directly requested
        perm_all = set(perm_req)

        # Expand result with permissions required by requested
        if permissions is not None:
            for req in reversed(req_list):
                if req.attr is None and req.dst in perm_all and req.src not in perm_all:
                    perm_all.add(req.src)
            for req in req_list:
                if req.attr is None and req.dst in perm_all and req.src not in perm_all:
                    assert False, "Permission %r is missing in collected permissions!" % req.src

        perm_rest = set(perm_req)

        result = self._result = dict([(perm, None) for perm in perm_all])
        explanation = self._explanation = dict([(perm, list()) for perm in perm_all]) \
            if explain else None

        for perm, rule in _acl_rules(resource, user, perm_all):
            if rule.action == 'allow':
                result[perm] = result[perm] in (None, True)
            elif rule.action == 'deny':
                result[perm] = False
                perm_rest.remove(perm)
            else:
                raise ValueError("Invalid action '{}'".format(rule.action))
            if explain:
                explanation[perm].append(ExplainACLRule(result[perm], rule.resource, rule))

        for perm, value in result.items():
            if value is None:
                result[perm] = False
                perm_rest.remove(perm)
                if explain:
                    explanation[perm].append(ExplainDefault(result[perm], resource))

        if len(perm_rest) == 0:
            return

        req_list = list(filter(lambda req: (
            result.get(req.dst) is True
        ), req_list))

        # Apply requirement dependencies

        dependencies = defaultdict(list)
        for req in req_list:
            dependencies[req.dst].append(req)

        for req in req_list:
            req_dst, req_src = req.dst, req.src
            if req.attr is None:
                if len(dependencies[req_src]) == 0:
                    req_satisfied = result[req_src] is True
                    if not req_satisfied:
                        result[req_dst] = False
                        perm_rest.remove(req_dst)
                    if explain:
                        explanation[req_dst].append(ExplainRequirement(
                            result[req_dst], resource, req, req_satisfied, None))
            else:
                attrval = getattr(resource, req.attr)
                if attrval is None:
                    if not req.attr_empty:
                        result[req_dst] = False
                        perm_rest.remove(req_dst)
                    if explain:
                        explanation[req_dst].append(ExplainRequirement(
                            result[req_dst], None, req, not req.attr_empty, None))
                else:
                    attr_resolver = PermissionResolver(attrval, user, (req_src, ), explain)
                    req_satisfied = attr_resolver._result[req_src] is True
                    if not req_satisfied:
                        result[req_dst] = False
                        perm_rest.remove(req_dst)
                    if explain:
                        explanation[req_dst].append(ExplainRequirement(
                            result[req_dst], attrval, req, req_satisfied, attr_resolver))


def _acl_rules(resource, user, permissions):
    for res in tuple(resource.parents) + (resource, ):
        rules = filter(lambda rule: (
            (rule.propagate or res == resource)
            and rule.cmp_identity(resource.identity)
            and rule.cmp_user(user)),
            res.acl)

        for rule in rules:
            for perm in permissions:
                if rule.cmp_permission(perm):
                    yield perm, rule


def _resource_requirements(resource):
    result = RequirementList()
    for scope in resource.__class__.scope.values():
        for req in scope.requirements:
            if req.cls is None or isinstance(resource, req.cls):
                result.append(req)
    result.toposort()
    return result
