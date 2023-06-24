from nextgisweb.env import Component, require

from .model import Base
from .util import COMP_ID


class SocialComponent(Component):
    identity = COMP_ID
    metadata = Base.metadata

    @require('resource')
    def setup_pyramid(self, config):
        from . import api, view # NOQA
        api.setup_pyramid(self, config)
