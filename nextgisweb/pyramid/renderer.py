from msgspec.json import encode as msgspec_dumpb

from nextgisweb.lib.json import dumpb as json_dumpb


class JSON:
    def __call__(self, info):
        def _render(value, system):
            request = system.get("request")
            if request is not None:
                response = request.response
                response.content_type = "application/json"
            return json_dumpb(value)

        return _render


class MsgSpec:
    def __call__(self, info):
        def _render(value, system):
            request = system.get("request")
            if request is not None:
                response = request.response
                response.content_type = "application/json"
            return msgspec_dumpb(value)

        return _render
