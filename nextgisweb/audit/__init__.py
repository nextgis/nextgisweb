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
        opt_audit = self.options.with_prefix('audit')
        self.audit_enabled = opt_audit['enabled']
        self.audit_es_host = opt_audit['es_host']

        if self.audit_enabled:
            self.es = Elasticsearch(self.audit_es_host)

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
        Option('audit.enabled', bool, default=False),
        Option('audit.es_host'),
    )
