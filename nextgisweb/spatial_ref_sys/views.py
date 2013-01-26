# -*- coding: utf-8 -*-
from types import MethodType


def setup_pyramid(comp, config):
    DBSession = comp.env.core.DBSession
    SRS = comp.SRS

    def client_settings(self, request):
        return dict(
            srs=[
                dict(id=srs.id, displayName=srs.display_name)
                for srs in DBSession.query(SRS)
            ]
        )

    # TODO: наверное это плохая идея, но тем не менее
    comp.client_settings = MethodType(client_settings, comp, comp.__class__)
