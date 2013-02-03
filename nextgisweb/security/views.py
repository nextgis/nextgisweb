# -*- coding: utf-8 -*-
from pyramid.renderers import render_to_response

from ..views import model_loader, model_context

from ..models import DBSession

def setup_pyramid(comp, config):
    DBSession = comp.env.core.DBSession

    ACL = comp.ACL
    ACLItem = comp.ACLItem

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
                permissions=dict([
                    (k, v)
                    for k, v in comp.permissions[rkey].iteritems()
                ]),
                children=_children(rkey),
                **rval                
            ))
            for rkey, rval in resources.iteritems()
        ])
        

    config.add_route("security.schema", "/security/schema") \
        .add_view(security_schema, renderer="json")

