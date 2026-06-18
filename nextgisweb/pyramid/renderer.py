from pathlib import Path

from mako.lookup import TemplateLookup
from msgspec.json import encode as msgspec_dumpb

from nextgisweb.env.package import pkginfo
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


class _MakoTemplateLookup(TemplateLookup):
    def adjust_uri(self, uri, relativeto):
        return uri

    def get_template(self, uri):
        try:
            if self.filesystem_checks:
                return self._check(uri, self._collection[uri])
            else:
                return self._collection[uri]
        except KeyError:
            if (p_uri := Path(uri)).is_absolute():
                srcfile = p_uri
            else:
                pkg, asset = uri.split(":", maxsplit=1)
                p = pkginfo.packages[pkg]
                srcfile = p._path / asset
            return self._load(srcfile, uri)


class Mako:
    def __init__(self, opts):
        self.lookup = _MakoTemplateLookup(**opts)

    def __call__(self, info):
        template = self.lookup.get_template(info.name)

        def _render(value, system):
            value["tr"] = system["tr"]

            if (request := system.get("request")) is not None:
                value["request"] = request
                response = request.response

                # Prevents showing outdated content when the user clicks the
                # back button in the browser.
                response.cache_control.no_store = True
                response.cache_control.must_revalidate = True

                # Attempt to upgrade insecure requests to HTTPS if the request
                # was made over HTTPS, especially for HTTP basemaps.
                if request.url.startswith("https://"):
                    response.headerlist.append(
                        (
                            "Content-Security-Policy",
                            "upgrade-insecure-requests",
                        )
                    )
            return template.render_unicode(**value)

        return _render
