# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

from math import ceil

from pyramid.response import Response

from elasticsearch_dsl import Search, Q
from elasticsearch_dsl.query import Bool


def audit_cget(request, date_from=None, date_to=None, user=None, limit=None):
    s = Search(
        using=request.env.audit.es,
        index="%s-*" % (request.env.audit.audit_es_index_prefix,)
    )
    s = s.using(request.env.audit.es)
    s = s.sort('@timestamp')

    if user is not None and user != '__all':
        if user == '__non_empty':
            s = s.query(Q('exists', **{'field': 'user.keyname'}))
        else:
            s = s.query(Q('term', **{'user.keyname': user}))

    if date_from is None and date_to is None:
        return []

    if date_from is not None:
        s = s.query(Q('range', **{'@timestamp': {'gte': date_from}}))

    if date_to is not None:
        s = s.query(Q('range', **{'@timestamp': {'lte': date_to}}))

    def hits(chunk_size=100, limit=None):
        response = s.execute()
        total = response.hits.total.value

        if limit is not None:
            total = min(total, limit)
            chunk_size = min(chunk_size, limit)

        nchunks = int(ceil(total / chunk_size))
        for nchunk in range(nchunks):
            for hit in s[nchunk * chunk_size : (nchunk + 1) * chunk_size]:
                yield hit

    return hits(limit=limit)


def export(request):
    return Response()


def setup_pyramid(comp, config):
    if comp.audit_enabled:
        config.add_route(
            'audit.export', '/api/component/audit/export') \
            .add_view(export, request_method='GET')
