from nextgisweb.lib.registry import dict_registry


@dict_registry
class FeatureExtension:
    def __init__(self, layer):
        self._layer = layer

    @property
    def layer(self):
        return self._layer
