import re
from datetime import datetime
from enum import Enum
from inspect import Parameter, signature
from typing import (
    TYPE_CHECKING,
    Any,
    ClassVar,
    Dict,
    List,
    Literal,
    Optional,
    Tuple,
    Type,
    Union,
)

from msgspec import UNSET, Meta, Struct, UnsetType, convert, defstruct, field, to_builtins
from pyramid.interfaces import IRoutesMapper
from pyramid.response import Response
from typing_extensions import Annotated

from nextgisweb.env import COMP_ID, Component, DBSession, env, gettext, gettextf, inject
from nextgisweb.env.package import pkginfo
from nextgisweb.lib.apitype import (
    AnyOf,
    AsJSON,
    ContentType,
    EmptyObject,
    Gap,
    StatusCode,
    fillgap,
)
from nextgisweb.lib.imptool import module_from_stack

from nextgisweb.auth import Permission
from nextgisweb.core import CoreComponent, KindOfData
from nextgisweb.core.exception import NotConfigured, ValidationError
from nextgisweb.core.fontconfig import FONT_MAX_SIZE, FONT_PATTERN, CustomFont, FontKey, SystemFont
from nextgisweb.file_upload import FileUpload, FileUploadRef
from nextgisweb.jsrealm import TSExport
from nextgisweb.resource import Resource, ResourceScope

from .component import PyramidComponent
from .permission import cors_manage, cors_view
from .tomb.predicate import RouteMeta
from .tomb.response import UnsafeFileResponse
from .util import gensecret, parse_origin, restart_delayed


def _get_cors_olist():
    try:
        return env.core.settings_get("pyramid", "cors_allow_origin")
    except KeyError:
        return None


def check_origin(request, origin):
    if origin is None:
        raise ValueError("Agument origin must have a value")

    olist = _get_cors_olist()

    if not olist:
        return False

    for url in olist:
        if origin == url:
            return True
        if "*" in url:
            o_scheme, o_domain, o_port = parse_origin(origin)[1:]
            scheme, domain, port = parse_origin(url)[1:]
            if o_scheme != scheme or o_port != port:
                continue
            wildcard_level = domain.count(".") + 1
            level_cmp = wildcard_level - 1
            upper = domain.rsplit(".", level_cmp)[-level_cmp:]
            o_upper = o_domain.rsplit(".", level_cmp)[-level_cmp:]
            if upper == o_upper:
                return True
    return False


def cors_tween_factory(handler, registry):
    """Tween adds Access-Control-* headers for simple and preflighted
    CORS requests"""

    def cors_tween(request):
        origin = request.headers.get("Origin")

        # Only request under /api/ are handled
        is_api = request.path_info.startswith("/api/")

        # If the Origin header is not present terminate this set of
        # steps. The request is outside the scope of this specification.
        # https://www.w3.org/TR/cors/#resource-preflight-requests

        # If there is no Access-Control-Request-Method header
        # or if parsing failed, do not set any additional headers
        # and terminate this set of steps. The request is outside
        # the scope of this specification.
        # http://www.w3.org/TR/cors/#resource-preflight-requests

        if is_api and origin is not None and request.check_origin(origin):
            # If the value of the Origin header is not a
            # case-sensitive match for any of the values
            # in list of origins do not set any additional
            # headers and terminate this set of steps.
            # http://www.w3.org/TR/cors/#resource-preflight-requests

            # The Origin header can only contain a single origin as
            # the user agent will not follow redirects.
            # http://www.w3.org/TR/cors/#resource-preflight-requests

            cors_headerlist = [
                ("Access-Control-Allow-Origin", origin),
                ("Access-Control-Allow-Credentials", "true"),
            ]

            if (
                (route := registry.getUtility(IRoutesMapper)(request)["route"])
                and (meta := RouteMeta.select(route.predicates))
                and (ch := meta.cors_headers)
            ):
                route_cors_headers = ch
            else:
                route_cors_headers = dict()

            # Access-Control-Request-Method header of preflight request
            method = request.headers.get("Access-Control-Request-Method")

            if method is not None and request.method == "OPTIONS":
                response = Response(content_type="text/plain")

                # Add one or more Access-Control-Allow-Methods headers
                # consisting of (a subset of) the list of methods.
                # Since the list of methods can be unbounded,
                # simply returning the method indicated by
                # Access-Control-Request-Method (if supported) can be enough.
                # http://www.w3.org/TR/cors/#resource-preflight-requests

                cors_headerlist.append(("Access-Control-Allow-Methods", method))

                # Authorization + CORS-safeist headers are allowed by default,
                # additional route-specific headers may be extracted from route
                # metadata.

                allowed_headers = {
                    "Authorization",
                    "Accept",
                    "Accept-Language",
                    "Content-Language",
                    "Content-Type",
                    "Range",
                }
                if req_ch := route_cors_headers.get("request"):
                    allowed_headers.update(req_ch)

                cors_headerlist.append(
                    ("Access-Control-Allow-Headers", ", ".join(allowed_headers))
                )

                response.headerlist.extend(cors_headerlist)

                return response

            else:
                if resp_ch := route_cors_headers.get("response"):
                    cors_headerlist.append(("Access-Control-Expose-Headers", ", ".join(resp_ch)))

                def set_cors_headers(request, response):
                    response.headerlist.extend(cors_headerlist)

                request.add_response_callback(set_cors_headers)

        # Run default request handler
        return handler(request)

    return cors_tween


SettingsComponentGap = Gap[Annotated[str, Meta(description="Component identity")]]


def settings(request, *, component: SettingsComponentGap) -> AsJSON[Dict[str, Any]]:
    """Read component settings"""
    comp = request.env.components[component]
    return comp.client_settings(request)


def route(request) -> AsJSON[Dict[str, Annotated[List[str], Meta(min_length=1)]]]:
    """Read route metadata"""
    return request.env.pyramid.route_meta


def pkg_version(request) -> AsJSON[Dict[str, str]]:
    """Read packages versions"""
    return {pn: p.version for pn, p in request.env.packages.items()}


class PingResponse(Struct, kw_only=True):
    current: float
    started: float


def ping(request) -> PingResponse:
    """Simple but useful request"""
    return PingResponse(
        current=datetime.utcnow().timestamp(),
        started=request.registry.settings["pyramid.started"],
    )


class HealthcheckResponse(Struct, kw_only=True):
    success: bool
    component: Dict[str, Any]


def healthcheck(
    request,
) -> AnyOf[
    Annotated[HealthcheckResponse, StatusCode(200)],
    Annotated[HealthcheckResponse, StatusCode(503)],
]:
    """Run healtchecks and return the result"""
    result = HealthcheckResponse(success=True, component=dict())
    components = [comp for comp in env.components.values() if hasattr(comp, "healthcheck")]
    for comp in components:
        cresult = comp.healthcheck()
        result.success = result.success and cresult["success"]
        result.component[comp.identity] = cresult

    if not result.success:
        request.response.status_code = 503

    return result


def statistics(request) -> AsJSON[Dict[str, Dict[str, Any]]]:
    """Compute and provide per-component statistics"""
    request.require_administrator()

    result = dict()
    for comp in request.env.components.values():
        if hasattr(comp, "query_stat"):
            result[comp.identity] = comp.query_stat()
    return result


KindOfDataResponse = Gap[Type[Struct]]


def kind_of_data(request) -> KindOfDataResponse:
    """Read available kinds of data schema"""

    tr = request.translate
    return KindOfDataResponse(**{k: tr(v.display_name) for k, v in KindOfData.registry.items()})


class StorageNotConfigured(NotConfigured):
    message = gettext("Storage management is not enabled on this server.")


@inject()
def require_storage_enabled(*, core: CoreComponent):
    if not core.options["storage.enabled"]:
        raise StorageNotConfigured


class StorageEstimateGetResponse(Struct, kw_only=True):
    active: bool


@inject()
def storage_estimate_get(request, *, core: CoreComponent) -> StorageEstimateGetResponse:
    """Check for storage estimation status"""
    request.require_administrator()
    require_storage_enabled()

    return StorageEstimateGetResponse(active=core.estimation_running())


def storage_estimate_post(request) -> EmptyObject:
    """Start full storage estimation"""
    request.require_administrator()
    require_storage_enabled()

    request.env.core.start_estimation()


StorageResponse = Gap[Type[Struct]]


class StorageValue(Struct, kw_only=True):
    estimated: Optional[Annotated[datetime, Meta(tz=False)]]
    updated: Optional[Annotated[datetime, Meta(tz=False)]]
    data_volume: Annotated[int, Meta(gt=0)]


@inject()
def storage(request, *, core: CoreComponent) -> StorageResponse:
    """Read storage usage"""
    request.require_administrator()
    require_storage_enabled()

    data = core.query_storage()
    data = {"total": data.pop(""), **data}

    return StorageResponse(**{k: StorageValue(**v) for k, v in data.items()})


def font_cread(request) -> AsJSON[List[Union[SystemFont, CustomFont]]]:
    """Get information about available fonts"""
    request.require_administrator()
    unordered = request.env.core.fontconfig.enumerate()
    return sorted(unordered, key=lambda i: (not isinstance(i, CustomFont), i.label))


class FontCUpdateBody(Struct, kw_only=True):
    add: List[FileUploadRef] = field(default_factory=list)
    remove: List[FontKey] = field(default_factory=list)


class FontCUpdateResponse(Struct, kw_only=True):
    restarted: bool
    timestamp: float


def font_cupdate(request, *, body: FontCUpdateBody) -> FontCUpdateResponse:
    """Add or remove custom fonts"""

    request.require_administrator()

    if len(body.remove) > 0:
        for font in body.remove:
            request.env.core.fontconfig.delete_font(font)

    if len(body.add) > 0:
        add = []
        for fupload_ref in body.add:
            fupload = FileUpload(id=fupload_ref.id)
            assert fupload.name is not None

            if not re.fullmatch(FONT_PATTERN, fupload.name):
                raise ValidationError(
                    gettextf(
                        "Invalid font file name: '{}'. Only latin letters, "
                        "digits, hyphens and underscores are allowed. "
                        "The *.ttf or *.otf extension is required."
                    )(fupload.name)
                )

            if fupload.size > FONT_MAX_SIZE:
                msgf = gettextf("Font '{0}' is larger than {1} bytes.")
                raise ValidationError(msgf(fupload.name, FONT_MAX_SIZE))

            add.append((fupload.name, fupload.data_path))

        for name, path in add:
            request.env.core.fontconfig.add_font(name, path)

    if restarted := (len(body.add) > 0 or len(body.remove) > 0):
        restart_delayed()

    return FontCUpdateResponse(
        restarted=restarted,
        timestamp=datetime.utcnow().timestamp(),
    )


@inject()
def codegen_api_type(
    request, *, pyramid: PyramidComponent
) -> Annotated[Response, ContentType("application/typescript")]:
    """Return autogenerated TypeScript API type definitions"""

    return UnsafeFileResponse(
        pyramid.root_path / "nodepkg/api/type.inc.d.ts",
        content_type="application/typescript",
    )


# Component settings machinery

SType = Type
SValue = Any


class csetting:
    component: str
    name: str

    gtype: SType
    stype: SType
    default: SValue
    read: Optional[Permission]
    write: Optional[Permission]
    skey: Tuple[str, str]
    ckey: Union[bool, Tuple[str, str]]

    registry: ClassVar[Dict[str, Dict[str, "csetting"]]] = dict()

    def __init__(
        self,
        name: str,
        type: Union[Any, Tuple[Any, Any]],
        *,
        default: Any = None,
        read: Optional[Permission] = None,
        write: Optional[Permission] = None,
        skey: Optional[Tuple[str, str]] = None,
        ckey: Optional[Union[bool, Tuple[str, str]]] = None,
        register: bool = True,
        stacklevel: int = 0,
    ):
        caller_module = module_from_stack(stacklevel)
        self.component = pkginfo.component_by_module(caller_module)

        self.name = name
        self.gtype, self.stype = type if isinstance(type, tuple) else (type, type)
        self.default = default
        if getattr(self, "read", None) is None or read is not None:
            self.read = read
        if getattr(self, "write", None) is None or write is not None:
            self.write = write

        if not getattr(self, "skey", None):
            self.skey = skey if skey else (self.component, self.name)
        elif skey is not None:
            raise ValueError("skey already defined")

        if not getattr(self, "ckey", None):
            self.ckey = ckey if ckey is not None else False
        elif ckey is not None:
            raise ValueError("ckey already defined")

        if register:
            if (comp_items := self.registry.get(self.component)) is None:
                self.registry[self.component] = comp_items = dict()

            assert self.name not in comp_items
            comp_items[self.name] = self

    def __init_subclass__(cls) -> None:
        name = cls.__name__
        if not re.match(r"^[a-z][a-z0-9_]*[a-z0-9]$", name):
            raise TypeError("snake_case class name required, got: " + name)

        type = getattr(cls, "vtype")
        default = getattr(cls, "default", None)

        cls(name, type, default=default, stacklevel=1)

    def normalize(self, value: SValue) -> Optional[SValue]:
        return value

    @inject()
    def getter(self, *, core: CoreComponent) -> SValue:
        try:
            value = core.settings_get(*self.skey)
        except KeyError:
            return self.default
        return convert(value, self.gtype)

    @inject()
    def setter(self, value: Optional[SValue], *, core: CoreComponent):
        if value is not None:
            value = self.normalize(value)

        if value is None:
            core.settings_delete(*self.skey)
        else:
            core.settings_set(*self.skey, to_builtins(value))

        if cskey := self.ckey:
            if cskey is True:
                cskey = (self.skey[0], self.skey[1] + ".ckey")
            core.settings_set(*cskey, gensecret(8))


def setup_pyramid_csettings(comp, config):
    NoneDefault = Annotated[None, Meta(description="Resets the setting to its default value.")]
    fld_unset = lambda n, t: (n, Union[t, UnsetType], UNSET)
    fld_reset = lambda n, t: (n, Union[t, NoneDefault, UnsetType], UNSET)

    rfields, ufields = list(), list()
    getters, setters = dict(), dict()
    read, write = dict(), dict()
    get_parameters = list()

    for cid, stngs in csetting.registry.items():
        sitems = list(stngs.items())
        component = Component.registry[cid]
        basename = component.basename

        rstruct = defstruct(
            f"{basename}CSettingsRead",
            [fld_unset(name, stng.gtype) for name, stng in sitems],
            module=f"{component.module}.api",
        )

        ustruct = defstruct(
            f"{basename}CSettingsUpdate",
            [fld_reset(name, stng.stype) for name, stng in sitems],
            module=f"{component.module}.api",
        )

        rfields.append(fld_unset(cid, rstruct))
        ufields.append(fld_unset(cid, ustruct))
        getters[cid] = {k: v.getter for k, v in sitems}
        setters[cid] = {k: v.setter for k, v in sitems}
        read[cid] = {k: v.read for k, v in sitems}
        write[cid] = {k: v.write for k, v in sitems}

        cslit = Literal[("all",) + tuple(stngs)]  # type: ignore
        cstype = Annotated[
            List[Annotated[cslit, TSExport(f"{basename}CSetting", component=cid)]],
            Meta(description=f"{basename} component settings to read"),
        ]
        get_parameters.append(
            Parameter(
                cid,
                Parameter.KEYWORD_ONLY,
                default=[],
                annotation=cstype,
            )
        )

    if TYPE_CHECKING:
        CSettingsRead = Struct
        CSettingsUpdate = Struct
    else:
        CSettingsRead = defstruct("CSettingsRead", rfields)
        CSettingsUpdate = defstruct("CSettingsUpdate", ufields)

    def get(request, **kwargs) -> CSettingsRead:
        """Read component settings"""

        is_administrator = request.user.is_administrator
        require_permission = request.user.require_permission

        sf = dict()
        for cid, attrs in kwargs.items():
            cgetters = getters[cid]
            cread = read[cid]
            if "all" in attrs:
                if len(attrs) > 1:
                    raise ValidationError(
                        message=gettextf(
                            "The '{}' query parameter should not contain "
                            "additional values if 'all' is specified."
                        )(cid)
                    )
                else:
                    attrs = list(cgetters)

            av = dict()
            for a in attrs:
                if (ap := cread[a]) is None:
                    if not is_administrator:
                        request.require_administrator()
                else:
                    require_permission(ap)
                av[a] = cgetters[a]()
            if len(av) > 0:
                sf[cid] = av

        return CSettingsRead(**sf)

    # Patch signature to get parameter extraction working
    get_sig = signature(get)
    get.__signature__ = get_sig.replace(
        parameters=[get_sig.parameters["request"]] + get_parameters
    )

    def put(request, *, body: CSettingsUpdate) -> EmptyObject:
        """Update component settings"""

        is_administrator = request.user.is_administrator
        require_permission = request.user.require_permission

        for cid, csetters in setters.items():
            if (cvalue := getattr(body, cid)) is not UNSET:
                for sid, loader in csetters.items():
                    if (abody := getattr(cvalue, sid)) is not UNSET:
                        if (ap := write[cid][sid]) is None:
                            if not is_administrator:
                                request.require_administrator()
                            else:
                                require_permission(ap)
                        loader(abody)

    config.add_route(
        "pyramid.csettings",
        "/api/component/pyramid/csettings",
        get=get,
        put=put,
    )


# Pyramid component setting

ORIGIN_RE = (
    r"^%(scheme)s(?:(\*\.)?(%(host)s\.)+(%(host)s)\.?|(%(host)s)|(%(ipv4)s))(:%(port)s)?\/?$"
    % dict(
        scheme=r"https?:\/\/",
        host=r"[_a-z-][_a-z0-9-]*",
        ipv4=r"((25[0-5]|(2[0-4]|1\d|[1-9]|)\d)\.?\b){4}",
        port=r"([1-9]|[1-9]\d{1,3}|[1-5]\d{4}|6[0-4]\d{3}|65[0-4]\d{2}|655[0-2]\d|6553[0-5])",
    )
)

AllowOrigin = Annotated[
    List[Annotated[str, Meta(pattern=ORIGIN_RE)]],
    Meta(
        description="Origins are composed of a scheme, domain, and an optional "
        "port if it differs from the default (80 for HTTP and 443 for HTTPS). "
        "Wildcards can be used on the third level and below in the domain.",
        examples=[
            [
                "https://example.com",
                "https://*.example.com",
                "http://localhost:8080",
                "http://127.0.0.1:8080",
            ]
        ],
    ),
]


class allow_origin(csetting):
    vtype = AllowOrigin
    default = list()
    read = cors_view
    write = cors_manage
    skey = (COMP_ID, "cors_allow_origin")

    def normalize(self, value: AllowOrigin) -> Optional[AllowOrigin]:
        value = [itm.rstrip("/").lower() for itm in value]
        result = list()
        for itm in value:
            norm = itm.rstrip("/").lower()
            norm = re.sub(r"^(http:\/\/.*):80$", lambda m: m.group(1), norm)
            norm = re.sub(r"^(https:\/\/.*):443$", lambda m: m.group(1), norm)
            if norm in result:
                raise ValidationError("Duplicate origin '%s'" % itm)
            result.append(norm)
        return result if result else None


class custom_css(csetting):
    vtype = str
    default = ""
    ckey = True

    def normalize(self, value: str) -> Optional[str]:
        if re.match(r"^\s*$", value, re.MULTILINE):
            return None
        return value


class LogoMimeType(Enum):
    PNG = "image/png"
    SVG = "image/svg+xml"


class header_logo(csetting):
    vtype = (Tuple[LogoMimeType, bytes], FileUploadRef)
    skey = (COMP_ID, "logo")
    ckey = True

    def normalize(self, value: FileUploadRef) -> Optional[Tuple[LogoMimeType, bytes]]:
        fupload = value()
        try:
            mime_type = LogoMimeType(fupload.mime_type)
        except ValueError:
            msg = gettextf("Got an unsupported MIME type: '{}'.")(fupload.mime_type)
            raise ValidationError(msg)
        if fupload.size > 64 * 1024:
            raise ValidationError(message=gettext("64K should be enough for a logo."))
        return mime_type, value().data_path.read_bytes()


class GoogleAnalytics(Struct):
    id: str


class YandexMetrica(Struct):
    id: str
    webvisor: bool


class Metrics(Struct):
    google_analytics: Union[GoogleAnalytics, UnsetType] = UNSET
    yandex_metrica: Union[YandexMetrica, UnsetType] = UNSET


csetting("full_name", Optional[str], skey=("core", "system.full_name"))
csetting("home_path", Optional[str])
csetting("metrics", Metrics, default={})


def setup_pyramid(comp, config):
    config.add_request_method(check_origin)

    config.add_tween(
        "nextgisweb.pyramid.api.cors_tween_factory",
        under=("nextgisweb.pyramid.exception.handled_exception_tween_factory", "INGRESS"),
    )

    comps = comp.env.components.values()
    comp_ids = [comp.identity for comp in comps if hasattr(comp, "client_settings")]
    fillgap(SettingsComponentGap, Literal[tuple(comp_ids)])

    config.add_route(
        "pyramid.settings",
        "/api/component/pyramid/settings",
        get=settings,
    )

    config.add_route(
        "pyramid.route",
        "/api/component/pyramid/route",
        load_types=True,
        get=route,
    )

    config.add_route(
        "pyramid.pkg_version",
        "/api/component/pyramid/pkg_version",
        get=pkg_version,
    )

    config.add_route(
        "pyramid.healthcheck",
        "/api/component/pyramid/healthcheck",
        get=healthcheck,
    )

    config.add_route(
        "pyramid.ping",
        "/api/component/pyramid/ping",
        get=ping,
    )

    config.add_route(
        "pyramid.statistics",
        "/api/component/pyramid/statistics",
        get=statistics,
    )

    fillgap(
        KindOfDataResponse,
        defstruct(
            "KindOfDataResponse",
            [(i, str) for i in KindOfData.registry.keys()],
            kw_only=True,
        ),
    )

    config.add_route(
        "pyramid.kind_of_data",
        "/api/component/pyramid/kind_of_data",
        load_types=True,
        get=kind_of_data,
    )

    fillgap(
        StorageResponse,
        defstruct(
            "StorageResponse",
            [("total", Annotated[StorageValue, Meta(description="Total storage usage")])]
            + [(i, Union[StorageValue, UnsetType], UNSET) for i in KindOfData.registry.keys()],
            kw_only=True,
            rename={"total": ""},
        ),
    )

    config.add_route(
        "pyramid.estimate_storage",
        "/api/component/pyramid/storage/estimate",
        get=storage_estimate_get,
        post=storage_estimate_post,
    )

    config.add_route(
        "pyramid.storage",
        "/api/component/pyramid/storage",
        get=storage,
    )

    config.add_route(
        "pyramid.font",
        "/api/component/pyramid/font",
        get=font_cread,
        put=font_cupdate,
    )

    config.add_route(
        "pyramid.codegen_api_type",
        "/api/component/pyramid/codegen/api_type",
        get=codegen_api_type,
    )

    # Methods for customization in components
    comp.company_logo_enabled = lambda request: True
    comp.company_logo_view = None
    comp.company_url_view = lambda request: comp.options["company_url"]

    comp.help_page_url_view = lambda request: (
        comp.options["help_page.url"] if comp.options["help_page.enabled"] else None
    )

    def preview_link_view(request):
        defaults = comp.preview_link_default_view(request)

        if (
            hasattr(request, "context")
            and isinstance(request.context, Resource)
            and request.context in DBSession
        ):
            if not request.context.has_permission(ResourceScope.read, request.user):
                return dict(image=None, description=None)

            social = request.context.social
            if social is not None:
                image = (
                    request.route_url(
                        "resource.preview",
                        id=request.context.id,
                        _query=str(social.preview_fileobj_id),
                    )
                    if social.preview_fileobj is not None
                    else defaults["image"]
                )
                description = (
                    social.preview_description
                    if social.preview_description is not None
                    else defaults["description"]
                )
                return dict(image=image, description=description)
        return defaults

    comp.preview_link_default_view = lambda request: dict(
        image=request.static_url("asset/pyramid/webgis-for-social.png"),
        description=gettext("Your Web GIS at nextgis.com"),
    )

    comp.preview_link_view = preview_link_view

    # TODO: Add PUT method for changing custom_css setting and GUI
