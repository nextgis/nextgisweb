# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

from math import ceil

from pyramid.response import Response

from elasticsearch_dsl import Search, Q
from elasticsearch_dsl.query import Bool


def audit_cget(request):
    request.require_administrator()

    date_from = request.params.get("date_from")
    date_to = request.params.get("date_to")
    user = request.params.get("user")

    s = Search(
        using=request.env.audit.es,
        index="%s-*" % (request.env.audit.audit_es_index_prefix,)
    )
    s = s.using(request.env.audit.es)
    s = s.sort('-@timestamp')

    if user is not None and user != "*":
        s = s.query(Q('term', **{'user.keyname': user}))

    if date_from is not None and date_to is not None:
        s = s.query(
            Bool(
                filter=[
                    Q('range', **{'@timestamp': {'gte': date_from, 'lte': date_to}})
                ]
            )
        )

    def hits(page_size=100):
        response = s.execute()
        npages = int(ceil(response.hits.total.value / page_size))
        for npage in range(npages):
            for hit in s[npage * page_size : (npage + 1) * page_size]:
                yield hit

    return hits()


def export(request):
    return Response()


def setup_pyramid(comp, config):
    if comp.audit_enabled:
        config.add_route(
            'audit.export', '/api/component/audit/export') \
            .add_view(export, request_method='GET')
