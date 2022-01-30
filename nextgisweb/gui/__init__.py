from ..component import Component

from .util import COMP_ID


__all__ = ['GUIComponent', ]


class GUIComponent(Component):
    identity = COMP_ID

    def setup_pyramid(self, config):
        from . import view
        view.setup_pyramid(self, config)
