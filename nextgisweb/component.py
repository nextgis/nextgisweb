# -*- coding: utf-8 -*-
import pkg_resources
from .registry import registry_maker

class Component(object):

    registry = registry_maker()

    @classmethod
    def initialize_database(cls, dbsession):
        pass

    @classmethod
    def setup_routes(cls, dbsession):
        pass


def load_all():
    for ep in pkg_resources.iter_entry_points(group='nextgisweb.component'):
        ep.load()
