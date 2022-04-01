from ..lib import json


class JSON:

    def __call__(self, info):
        def _render(value, system):
            request = system.get('request')
            if request is not None:
                response = request.response
                response.content_type = 'application/json'
            return json.dumpb(value)

        return _render
