# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

from math import ceil

import unicodecsv
from elasticsearch_dsl import Q, Search
from flatdict import FlatDict
from pyramid.httpexceptions import HTTPNotFound
from pyramid.response import Response
from six import StringIO


def audit_cget(
    request, date_from=None, date_to=None, user=None, order="desc", limit=None
):
    s = Search(
        using=request.env.audit.es,
        index="%s-*" % (request.env.audit.audit_es_index_prefix,),
    )
    s = s.using(request.env.audit.es)
    s = s.sort("%s%s" % ({"asc": "", "desc": "-"}[order], "@timestamp"))

    if user is not None and user != "__all":
        if user == "__non_empty":
            s = s.query(Q("exists", **{"field": "user.keyname"}))
        else:
            s = s.query(Q("term", **{"user.keyname": user}))

    if date_from is None and date_to is None:
        return []

    if date_from is not None and date_from != "":
        s = s.query(Q("range", **{"@timestamp": {"gte": date_from}}))

    if date_to is not None and date_to != "":
        s = s.query(Q("range", **{"@timestamp": {"lte": date_to}}))

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
    request.require_administrator()

    date_from = request.params.get("date_from")
    date_to = request.params.get("date_to")
    user = request.params.get("user")

    hits = audit_cget(
        request=request,
        date_from=date_from,
        date_to=date_to,
        user=user,
    )

    hits = map(lambda h: h.to_dict(), hits)
    hits = map(lambda h: FlatDict(h, delimiter="."), hits)
    hits = list(hits)

    if len(hits) == 0:
        raise HTTPNotFound()

    buf = StringIO()
    writer = unicodecsv.writer(buf, dialect="excel")

    headrow = (
        "@timestamp",
        "request.method",
        "request.path",
        "request.query_string",
        "request.remote_addr",
        "response.status_code",
        "response.route_name",
        "user.id",
        "user.keyname",
        "user.display_name",
        "context.id",
        "context.model",
    )
    writer.writerow(headrow)

    for hit in hits:
        datarow = map(lambda key: hit.get(key), headrow)
        writer.writerow(datarow)

    content_disposition = "attachment; filename=audit.csv"

    return Response(
        buf.getvalue(), content_type="text/csv", content_disposition=content_disposition
    )


def setup_pyramid(comp, config):
    if comp.audit_es_enabled:
        config.add_route("audit.export", "/api/component/audit/export").add_view(
            export, request_method="GET"
        )
