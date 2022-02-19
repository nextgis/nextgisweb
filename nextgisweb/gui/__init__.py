from ..component import Component

from .util import COMP_ID, REACT_RENDERER


__all__ = ['GUIComponent', 'REACT_RENDERER']


class GUIComponent(Component):
    identity = COMP_ID

    def setup_pyramid(self, config):
        from . import view
        view.setup_pyramid(self, config)
