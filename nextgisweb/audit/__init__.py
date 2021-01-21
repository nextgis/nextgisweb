# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals
import json
from pkg_resources import resource_filename

from elasticsearch import Elasticsearch
import elasticsearch.exceptions as esexc

from ..component import Component
from ..lib.config import Option

from .util import disable_logging


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
    )
