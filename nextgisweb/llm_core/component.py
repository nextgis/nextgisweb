from functools import cached_property

import anthropic

from nextgisweb.env import Component
from nextgisweb.lib.config import Option


class LLMCoreComponent(Component):
    def setup_pyramid(self, config):
        from . import view

        view.setup_pyramid(self, config)

    @cached_property
    def available(self):
        return bool(self.options.get("api_key"))

    @cached_property
    def anthropic_client(self):
        return anthropic.Anthropic(api_key=self.options["api_key"])

    # fmt: off
    option_annotations = (
        Option("api_key", default=None, doc="Anthropic API key"),
        Option("model", default="claude-haiku-4-5-20251001", doc="LLM model name"),
    )
    # fmt: on
