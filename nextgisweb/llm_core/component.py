from openai import OpenAI

from nextgisweb.env import Component
from nextgisweb.lib.config import Option


class LLMCoreComponent(Component):
    _client: OpenAI | None = None

    def setup_pyramid(self, config):
        from . import view

        view.setup_pyramid(self, config)

    @property
    def available(self):
        return bool(self.options.get("api_key"))

    @property
    def effective_model(self):
        return self.options.get("model")

    def make_client(self):
        if self._client is None:
            base_url = self.options.get("base_url")
            api_key = self.options.get("api_key")
            if not api_key:
                raise ValueError("API key is not configured")
            self._client = OpenAI(api_key=api_key, base_url=base_url)

        return self._client

    # fmt: off
    option_annotations = (
        Option("base_url", default="https://api.openai.com/v1", doc="OpenAI-compatible API base URL"),
        Option("api_key", default=None, doc="API key"),
        Option("model", default="gpt-4o-mini", doc="LLM model name"),
    )
    # fmt: on
