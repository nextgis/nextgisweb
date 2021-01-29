# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals
import json
from pkg_resources import resource_filename

from elasticsearch import Elasticsearch
import elasticsearch.exceptions as esexc

from ..component import Component
from ..lib.config import Option

from .util import disable_logging, OnResponse

__all__ = ['OnResponse']


class AuditComponent(Component):
    identity = 'audit'

    def initialize(self):
        self.audit_enabled = self.options['enabled']

        self.audit_es_host = self.options.get('elasticsearch.host', None)
        self.audit_es_port = self.options['elasticsearch.port']
        self.audit_es_index_prefix = self.options['elasticsearch.index.prefix']
        self.audit_es_index_suffix = self.options['elasticsearch.index.suffix']

        self.audit_file = self.options.get('file', None)

        if self.audit_enabled and (
            self.audit_es_host is None and self.audit_file is None
        ):
            raise ValueError("Elasticsearch or file not specified for audit.")

        self.audit_es_enabled = self.audit_enabled and self.audit_es_host is not None
        self.audit_file_enabled = self.audit_enabled and self.audit_file is not None

        if self.audit_es_enabled:
            self.es = Elasticsearch('%s:%d' % (
                self.audit_es_host,
                self.audit_es_port,
            ))

        if self.audit_file_enabled:
            self.file = open(self.options['file'], 'a')

        # Setup filters from options
        self.request_filters = request_filters = []

        if self.audit_enabled:
            request_filters.append(lambda req: not req.path_info.startswith(
                ("/static/", "/_debug_toolbar/", "/favicon.ico")))

            f_method_inc = self.options['request_method.include']
            if f_method_inc is not None:
                f_method_inc = tuple(f_method_inc)
                request_filters.append(
                    lambda req: req.method in f_method_inc)

            f_method_exc = self.options['request_method.exclude']
            if f_method_exc is not None:
                f_method_exc = tuple(f_method_exc)
                request_filters.append(
                    lambda req: req.method not in f_method_exc)

            f_path_inc = self.options['request_path.include']
            if f_path_inc is not None:
                f_path_inc = tuple(f_path_inc)
                request_filters.append(
                    lambda req: req.path_info.startswith(f_path_inc))

            f_path_exc = self.options['request_path.exclude']
            if f_path_exc is not None:
                f_path_exc = tuple(f_path_exc)
                request_filters.append(
                    lambda req: not req.path_info.startswith(f_path_exc))

    def is_service_ready(self):
        if self.audit_es_enabled:
            while True:
                try:
                    with disable_logging():
                        self.es.cluster.health(
                            wait_for_status='yellow',
                            request_timeout=1 / 4)
                    break
                except (esexc.ConnectionError, esexc.ConnectionTimeout) as exc:
                    yield exc.info.message

    def initialize_db(self):
        if self.audit_es_enabled:
            # OOPS: Elasticsearch mappings are not related to database!
            with open(resource_filename('nextgisweb', 'audit/template.json')) as f:
                template = json.load(f)
                template['index_patterns'] = ['%s-*' % (self.audit_es_index_prefix,)]
                self.es.indices.put_template('nextgisweb_audit', body=template)

    def setup_pyramid(self, config):
        from . import api, view
        api.setup_pyramid(self, config)
        view.setup_pyramid(self, config)

    option_annotations = (
        Option('enabled', bool, default=False),
        Option('elasticsearch.host'),
        Option('elasticsearch.port', int, default=9200),
        Option('elasticsearch.index.prefix', default='nextgisweb-audit'),
        Option('elasticsearch.index.suffix', default='%Y.%m'),
        Option('file', doc='Log events in ndjson format'),

        Option('request_method.include', list, default=None,
               doc="Log only given request methods"),
        Option('request_method.exclude', list, default=None,
               doc="Don't log given request methods"),

        Option('request_path.include', list, default=None,
               doc="Log only given request path prefixes"),
        Option('request_path.exclude', list, default=None,
               doc="Don't log given request path prefixes"),
    )
