from os import path

from cachetools import TTLCache

from nextgisweb.env import Component, require
from nextgisweb.lib.config import Option, OptionAnnotations

from .model import validate_filename

PRESET_DIR = path.join(path.dirname(__file__), "preset/")


class SVGMarkerLibraryComponent(Component):
    def initialize(self):
        self.cache = TTLCache(maxsize=128, ttl=60)

    @require("resource")
    def setup_pyramid(self, config):
        from . import api, view

        api.setup_pyramid(self, config)
        view.setup_pyramid(self, config)

    def lookup(self, name, library=None):
        validate_filename(name)

        ckey = (name, library.id if library else None)
        try:
            cval = self.cache[ckey]
            return cval
        except KeyError:
            pass

        if library is not None:
            lib_marker = library.find_svg_marker(name)
            if lib_marker is not None:
                result = lib_marker.path
                self.cache[ckey] = result
                return result

        name = name + ".svg"
        for svg_dir in self.options["path"]:
            candidate = path.join(svg_dir, name)
            if path.isfile(candidate):
                self.cache[ckey] = candidate
                return candidate

        return None

    # fmt: off
    option_annotations = OptionAnnotations((
        Option("path", list, default=[PRESET_DIR], doc="Search paths for SVG files."),
    ))
    # fmt: on
