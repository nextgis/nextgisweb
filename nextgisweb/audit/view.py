# -*- coding: utf-8 -*-
from datetime import datetime

from elasticsearch import NotFoundError
from .util import _, es_index
from .. import dynmenu as dm


def journal(request):
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
                }
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
        docs=docs,
        dynmenu=request.env.pyramid.control_panel)


def setup_pyramid(comp, config):
    config.add_tween(
        'nextgisweb.audit.util.elasticsearch_tween_factory',
        under=('nextgisweb.pyramid.util.header_encoding_tween_factory',))

    config.add_route(
        'audit.control_panel.journal',
        '/control-panel/journal'
    ).add_view(journal, renderer='nextgisweb:audit/template/journal.mako')

    comp.env.pyramid.control_panel.add(
        dm.Label('audit', _("Audit")),
        dm.Link('audit/journal', _("Journal"), lambda args: (
            args.request.route_url('audit.control_panel.journal'))),
    )