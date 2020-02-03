# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

import json

from elasticsearch import Elasticsearch
from pkg_resources import resource_filename

from ..component import Component
from ..lib.config import Option


class AuditComponent(Component):
    identity = 'audit'

    def initialize(self):
        opt_audit = self.options.with_prefix('audit')
        self.audit_enabled = opt_audit['enabled']
        self.audit_es_host = opt_audit['es_host']

        if self.audit_enabled:
            self.es = Elasticsearch(self.audit_es_host)

            with open(resource_filename('nextgisweb', 'audit/template.json')) as f:
                self.es.indices.put_template('nextgisweb_audit', body=json.load(f))

    def setup_pyramid(self, config):
        from . import view
        view.setup_pyramid(self, config)

    option_annotations = (
        Option('audit.enabled', bool, default=False),
        Option('audit.es_host'),
    )
