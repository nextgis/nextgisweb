import os.path
from mimetypes import guess_type

from pyramid.httpexceptions import HTTPNotFound
from pyramid.response import FileResponse


class StaticFileResponse(FileResponse):
    def __init__(self, filename, *, cache=True, request) -> None:
        content_type, _ = guess_type(filename)

        found_encoding = None
        if (
            (pref := request.env.pyramid.options["compression.algorithms"])
            and (aenc := request.accept_encoding)
            and (match := aenc.best_match(pref))
        ):
            try_filename = filename + "." + match
            if os.path.isfile(try_filename):
                filename = try_filename
                found_encoding = match

        if found_encoding is None and not os.path.isfile(filename):
            raise HTTPNotFound()

        super().__init__(
            filename,
            content_type=content_type,
            cache_max_age=3600 if cache else None,
            request=request,
        )

        if found_encoding:
            self.headers["Content-Encoding"] = found_encoding

        self.headers["Vary"] = "Accept-Encoding"


class UnsafeFileResponse(FileResponse):
    def __init__(self, source, *, request=None, **kwargs):
        super().__init__(source, request=request, **kwargs)
        self.headers["Content-Security-Policy"] = "sandbox"
