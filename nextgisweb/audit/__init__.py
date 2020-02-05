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
        self.audit_es_host = self.options['elasticsearch.host']
        self.audit_es_port = self.options['elasticsearch.port']

        if self.audit_enabled:
            self.es = Elasticsearch('%s:%d' % (
                 self.audit_es_host,
                 self.audit_es_port,
            ))

    def is_service_ready(self):
        if self.audit_enabled:
            while True:
                try:
                    with disable_logging():
                        self.es.cluster.health(
                            wait_for_status='yellow',
                            request_timeout=1 / 4)
                    break
                except (esexc.ConnectionError, esexc.ConnectionTimeout) as exc:
                    yield

    def initialize_db(self):
        if self.audit_enabled:
            # OOPS: Elasticsearch mappings are not related to database!
            with open(resource_filename('nextgisweb', 'audit/template.json')) as f:
                self.es.indices.put_template('nextgisweb_audit', body=json.load(f))

    def setup_pyramid(self, config):
        from . import view
        view.setup_pyramid(self, config)

    option_annotations = (
        Option('enabled', bool, default=False),
        Option('elasticsearch.host', default='elasticsearch'),
        Option('elasticsearch.port', default=9200),
        Option('elasticsearch.index.prefix', default='nextgisweb-audit'),
        Option('elasticsearch.index.suffix', default='%Y.%m'),
    )