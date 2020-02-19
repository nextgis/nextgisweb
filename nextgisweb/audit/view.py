# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals
from datetime import datetime, timedelta
from collections import OrderedDict

from pyramid.httpexceptions import HTTPNotFound

from .. import dynmenu as dm
from .api import audit_cget
from .util import _, es_index, audit_context


PAGE_SIZE = 20
DATE_FORMAT = '%Y-%m-%dT%H:%M:%S.%f'

def journal_browse(request):
    request.require_administrator()

    date_from = request.params.get("date_from", "")
    date_to = request.params.get("date_to", "")
    date_first = request.params.get("date_first")
    date_last = request.params.get("date_last")
    user = request.params.get("user")

    kwargs = dict(
        request=request,
        user=user,
        limit=PAGE_SIZE
    )

    if date_first is not None and date_last is not None:
        raise ValueError(_("'date_first' and 'date_last' are mutually exclusive."))

    if date_last:
        date_last = datetime.strptime(date_last, DATE_FORMAT) - timedelta(milliseconds=1)
        date_last = date_last.strftime(DATE_FORMAT)

    if date_first:
        kwargs['order'] = 'asc'
        date_first = datetime.strptime(date_first, DATE_FORMAT) + timedelta(milliseconds=1)
        date_first = date_first.strftime(DATE_FORMAT)

    kwargs['date_from'] = date_first or date_from
    kwargs['date_to'] = date_last or date_to

    hits = list(audit_cget(**kwargs))

    if date_first:
        hits = hits[::-1]

    return dict(
        title=_("Journal"),
        maxwidth=True,
        hits=hits,
        date_from=date_from,
        date_to=date_to,
        user=user,
        page_size=PAGE_SIZE,
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
