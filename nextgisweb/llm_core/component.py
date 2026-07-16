from openai import OpenAI

from nextgisweb.env import Component
from nextgisweb.lib.config import Option

from . import api


class LLMCoreComponent(Component):
    _client: OpenAI | None = None
    _client_cache_key: tuple[str, str | None] | None = None

    def setup_pyramid(self, config):
        from . import view

        view.setup_pyramid(self, config)

    def get_effective(self, name: str):
        value = getattr(api, name).getter()
        if value is not None:
            return value
        return self.options.get(name)

    @property
    def available(self):
        return bool(self.get_effective("api_key"))

    @property
    def effective_model(self):
        return self.get_effective("model")

    def make_client(self):
        api_key = self.get_effective("api_key")
        if not api_key:
            raise ValueError("API key is not configured")
        base_url = self.get_effective("base_url")
        key = (api_key, base_url)

        if self._client is not None and self._client_cache_key == key:
            return self._client

        kwargs = {"api_key": api_key}
        if base_url:
            kwargs["base_url"] = base_url
        self._client = OpenAI(**kwargs)
        self._client_cache_key = key
        return self._client

    # fmt: off
    option_annotations = (
        Option("base_url", default=None, doc="OpenAI-compatible API base URL"),
        Option("api_key", default=None, doc="API key"),
        Option("model", default="gpt-4o-mini", doc="LLM model name"),
    )
    # fmt: on
