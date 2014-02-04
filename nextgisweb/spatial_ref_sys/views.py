# -*- coding: utf-8 -*-
from types import MethodType

from .models import SRS


def setup_pyramid(comp, config):

    def client_settings(self, request):
        return dict(
            srs=[
                dict(id=srs.id, displayName=srs.display_name)
                for srs in SRS.query()
            ]
        )

    # TODO: наверное это плохая идея, но тем не менее
    comp.client_settings = MethodType(client_settings, comp, comp.__class__)
