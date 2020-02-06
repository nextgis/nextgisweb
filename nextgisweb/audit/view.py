# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals
from datetime import datetime

from elasticsearch import NotFoundError
from pyramid.httpexceptions import HTTPNotFound

from .. import dynmenu as dm

from .util import _, es_index, audit_context


def journal_browse(request):
    request.require_administrator()

    timestamp = datetime.now()
    date = timestamp.strftime("%Y-%m-%d")
    date = request.params.get("date", date)

    index = es_index(timestamp)
    docs = []

    try:
        request.env.audit.es.indices.refresh(index=index)

        data = request.env.audit.es.search(
            index=index,
            scroll="1m",
            size=1000,
            body={
                "query": {
                    "range": {"@timestamp": {"gte": date, "lte": date}}
                },
                "sort": [
                    {"@timestamp": "desc"},
                ]
            },
        )
        scroll_id = data['_scroll_id']
        scroll_size = len(data['hits']['hits'])

        while scroll_size > 0:
            docs.extend(data['hits']['hits'])

            data = request.env.audit.es.scroll(scroll_id=scroll_id, scroll='1m')
            scroll_id = data['_scroll_id']
            scroll_size = len(data['hits']['hits'])

    except NotFoundError:
        pass

    return dict(
        title=_("Journal"),
        maxwidth=True,
        docs=docs,
        dynmenu=request.env.pyramid.control_panel)


def journal_show(request):
    request.require_administrator()
    rid = request.matchdict['id']

    timestamp = datetime.now()
    index = es_index(timestamp)

    docs = request.env.audit.es.search(
        index=index,
        body=dict(query=dict(
            ids=dict(values=[rid, ])
        )))

    hits = docs['hits']
    if hits['total']['value'] != 1:
        raise HTTPNotFound()

    doc = hits['hits'][0]

    return dict(
        title=_("Journal record: %s") % rid, doc=doc,
        dynmenu=request.env.pyramid.control_panel)


def setup_pyramid(comp, config):
    # This method can be called from other components,
    # so should be enabled even audit component disabled.
    config.add_request_method(audit_context)

    if comp.audit_enabled:
        config.add_tween(
            'nextgisweb.audit.util.elasticsearch_tween_factory',
            under=('nextgisweb.pyramid.util.header_encoding_tween_factory',))

        config.add_route(
            'audit.control_panel.journal.browse',
            '/control-panel/journal/'
        ).add_view(journal_browse, renderer='nextgisweb:audit/template/browse.mako')

        config.add_route(
            'audit.control_panel.journal.show',
            '/control-panel/journal/{id}'
        ).add_view(journal_show, renderer='nextgisweb:audit/template/show.mako')

        comp.env.pyramid.control_panel.add(
            dm.Label('audit', _("Audit")),
            dm.Link('audit/journal', _("Journal"), lambda args: (
                args.request.route_url('audit.control_panel.journal.browse'))),
        )
