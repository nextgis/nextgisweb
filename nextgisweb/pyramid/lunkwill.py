import socket
from base64 import urlsafe_b64decode, urlsafe_b64encode
from functools import cached_property
from urllib.parse import urlunparse

import urllib3
from cryptography.hazmat.primitives import ciphers, hashes
from cryptography.hazmat.primitives.ciphers import algorithms, modes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from msgspec import DecodeError, Struct
from msgspec.msgpack import decode as msgspec_decode
from msgspec.msgpack import encode as msgspec_encode
from pyramid.httpexceptions import HTTPBadRequest
from pyramid.response import Response

from nextgisweb.env import gettext, inject
from nextgisweb.lib import json

from nextgisweb.core.exception import NotConfigured

from .component import PyramidComponent


class LunkwillNotConfigured(NotConfigured):
    title = gettext("Lunkwill not enabled")
    message = gettext("The Lunkwill extension is not configured on this server.")


@inject()
def require_lunkwill_configured(*, comp: PyramidComponent):
    if not comp.options["lunkwill.enabled"]:
        raise LunkwillNotConfigured


class Cipher:
    def __init__(self, secret: str):
        self._secret = secret

    @cached_property
    def cipher(self) -> ciphers.Cipher:
        # We don't need lots of security here as it's just temporary request ID
        # and IP address. Thus the number of iteration is small, and an
        # intialization vector is derived from the key, which is insecure.
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=__name__.encode(),
            iterations=1000,
        )
        derived = kdf.derive(self._secret.encode())
        key, ivector = derived[:16], derived[16:]
        return ciphers.Cipher(algorithms.AES(key), modes.CFB(ivector))

    def encrypt(self, data: bytes) -> bytes:
        encryptor = self.cipher.encryptor()
        return encryptor.update(data) + encryptor.finalize()

    def decrypt(self, data: bytes) -> bytes:
        decryptor = self.cipher.decryptor()
        return decryptor.update(data) + decryptor.finalize()


class LunkwillRequestID(Struct, kw_only=True, array_like=True):
    request_id: str
    address: str

    def encode(self, cipher: Cipher) -> str:
        mp = msgspec_encode(self)
        data = cipher.encrypt(mp)
        b64 = urlsafe_b64encode(data)
        return b64.rstrip(b"=").decode()

    @classmethod
    def decode(cls, value: str, cipher: Cipher) -> "LunkwillRequestID":
        if mod := (len(value) % 4):
            value += "=" * (4 - mod)
        data = urlsafe_b64decode(value)
        mp = cipher.decrypt(data)
        return msgspec_decode(mp, type=cls)


def setup_pyramid(comp, config):
    config.add_route(
        "lunkwill.summary",
        "/api/lunkwill/{id:str}/summary",
        get=proxy,
    )

    config.add_route(
        "lunkwill.response",
        "/api/lunkwill/{id:str}/response",
        get=proxy,
    )

    opts = comp.options.with_prefix("lunkwill")

    if opts["enabled"]:
        st = config.registry.settings

        def lunkwill_url(*, host=opts["host"], path, query):
            return urlunparse(
                ("http", "{}:{}".format(host, opts["port"]), path, None, query, None)
            )

        st["lunkwill.url"] = lunkwill_url
        st["lunkwill.pool"] = urllib3.PoolManager()
        if secret := opts["secret"]:
            st["lunkwill.crypto"] = Cipher(secret)

        def lunkwill(request):
            v = request.headers.get("X-Lunkwill")
            if v is not None:
                v = v.lower()
                if v not in ("suggest", "require"):
                    raise HTTPBadRequest(explanation="Invalid X-Lunkwill header")
                return v
            return None

        config.add_request_method(lunkwill, reify=True)

        config.add_tween(
            "nextgisweb.pyramid.lunkwill.tween_factory",
            under=["nextgisweb.pyramid.api.cors_tween_factory"],
        )


def tween_factory(handler, registry):
    pool = registry.settings["lunkwill.pool"]
    headers_rm = {h.lower() for h in ("X-Lunkwill",)}

    def tween(request):
        if request.lunkwill is not None:
            url = request.registry.settings["lunkwill.url"](
                path=request.path, query=request.query_string
            )
            headers = {k: v for k, v in request.headers.items() if k.lower() not in headers_rm}
            resp = pool.request(
                request.method, url, headers=headers, body=request.body_file, retries=False
            )
            if crypto := request.registry.settings.get("lunkwill.crypto"):
                data = json.loads(resp.data)
                address = socket.gethostbyname(socket.gethostname())
                lw_request_id = LunkwillRequestID(request_id=data["id"], address=address)
                data["id"] = lw_request_id.encode(crypto)
                body = json.dumpb(data)
            else:
                body = resp.data
            return Response(body=body, status=resp.status, headerlist=resp.headers.items())

        return handler(request)

    return tween


def proxy(request):
    require_lunkwill_configured()

    lw_request_id = None
    if crypto := request.registry.settings.get("lunkwill.crypto"):
        try:
            lw_request_id = LunkwillRequestID.decode(request.matchdict["id"], crypto)
        except (ValueError, DecodeError):
            pass

    if lw_request_id is not None:
        path = request.matched_route.generate(dict(id=lw_request_id.request_id))
        url = request.registry.settings["lunkwill.url"](
            host=lw_request_id.address, path=path, query=request.query_string
        )
    else:
        url = request.registry.settings["lunkwill.url"](
            path=request.path, query=request.query_string
        )
    headers = {k: v for k, v in request.headers.items() if k.lower() not in ("connection",)}
    headers["Connection"] = "close"
    pool = request.registry.settings["lunkwill.pool"]
    resp = pool.request(request.method, url, headers=headers, retries=False, preload_content=False)

    if request.matched_route.name == "lunkwill.summary" and lw_request_id is not None:
        data = json.loads(resp.data)
        data["id"] = request.matchdict["id"]
        resp_kw = dict(body=json.dumpb(data))
    else:
        resp_kw = dict(app_iter=resp.stream())
    return Response(status=resp.status, headerlist=resp.headers.items(), **resp_kw)
