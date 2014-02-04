# -*- coding: utf-8 -*-
from pyramid.httpexceptions import HTTPForbidden

from .. import dynmenu as dm

from .models import ResourceACLRoot


def setup_pyramid(comp, config):

    def security_schema(request):
        resources = comp.resources

        def _children(resource, children=None):
            if not children:
                children = list()

            for c in comp.children[resource]:
                if not c in children:
                    children.append(c)
                    _children(c, children)

            return children

        return dict([
            (rkey, dict(
                permissions=dict(
                    [(k, v) for k, v in comp.permissions[rkey].iteritems()]),
                children=_children(rkey),
                **rval
            ))
            for rkey, rval in resources.iteritems()
        ])

    config.add_route("security.schema", "/security/schema") \
        .add_view(security_schema, renderer="json")

    def resource_acl_root_get(request):
        if not request.user.is_administrator:
            raise HTTPForbidden()

        root_acl = ResourceACLRoot \
            .filter_by(**request.matchdict).one()

        acl_items = [
            dict(
                principal_id=i.principal_id,
                resource=i.resource,
                permission=i.permission,
                operation=i.operation,
                # Доп. поля для отображения
                principal_cls=i.principal.cls,
                principal_keyname=i.principal.keyname,
                principal_display_name=i.principal.display_name,
            )
            for i in root_acl.acl.items
        ]
        return dict(
            acl_items=acl_items,
            resource=root_acl.resource,
        )

    def resource_acl_root_post(request):
        if not request.user.is_administrator:
            raise HTTPForbidden()

        root_acl = ResourceACLRoot \
            .filter_by(**request.matchdict).one()

        def iteritems():
            for r in request.json_body:
                yield (
                    r['principal_id'], r['resource'],
                    r['permission'], r['operation']
                )

        root_acl.acl.update(iteritems(), replace=True)

    config.add_route("security.resource_acl_root", r'/{resource:[^\/]+}/acl') \
        .add_view(resource_acl_root_get, request_method='GET',
                  renderer='security/resource_acl_root.mako') \
        .add_view(resource_acl_root_post, request_method='POST',
                  renderer='json')

    class ResourceACLRootMenu(dm.DynItem):

        def build(self, kwargs):

            for resource, resopt in comp.resources.iteritems():
                if resopt.get('parent_required', False):
                    continue

                yield dm.Link(
                    self.sub(resource), resopt.get('label', resource),
                    self._create_url(resource)
                )

        def _create_url(self, resource):
            return lambda kwargs: kwargs.request.route_url(
                'security.resource_acl_root',
                resource=resource,
            )

    comp.env.pyramid.control_panel.add(
        dm.Label('resource-acl-root', u"Базовые права доступа"),
        ResourceACLRootMenu('resource-acl-root'),
    )
