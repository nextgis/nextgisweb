import re
from datetime import datetime
from enum import Enum
from inspect import Parameter, signature
from typing import TYPE_CHECKING, Any, ClassVar, Dict, List, Literal, Optional, Tuple, Type, Union

from msgspec import UNSET, Meta, Struct, UnsetType, convert, defstruct, to_builtins
from pyramid.response import Response
from typing_extensions import Annotated

from nextgisweb.env import COMP_ID, Component, DBSession, _, env, inject
from nextgisweb.env.package import pkginfo
from nextgisweb.lib.apitype import AnyOf, AsJSON, EmptyObject, Gap, StatusCode, fillgap
from nextgisweb.lib.imptool import module_from_stack

from nextgisweb.core import CoreComponent, KindOfData
from nextgisweb.core.exception import NotConfigured, ValidationError
from nextgisweb.file_upload import FileUploadRef
from nextgisweb.resource import Resource, ResourceScope

from .util import gensecret, parse_origin


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

    def hadd(response, n, v):
        response.headerlist.append((n, v))

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

            # Access-Control-Request-Method header of preflight request
            method = request.headers.get("Access-Control-Request-Method")

            if method is not None and request.method == "OPTIONS":
                response = Response(content_type="text/plain")

                # The Origin header can only contain a single origin as
                # the user agent will not follow redirects.
                # http://www.w3.org/TR/cors/#resource-preflight-requests

                hadd(response, "Access-Control-Allow-Origin", origin)

                # Add one or more Access-Control-Allow-Methods headers
                # consisting of (a subset of) the list of methods.
                # Since the list of methods can be unbounded,
                # simply returning the method indicated by
                # Access-Control-Request-Method (if supported) can be enough.
                # http://www.w3.org/TR/cors/#resource-preflight-requests

                hadd(response, "Access-Control-Allow-Methods", method)
                hadd(response, "Access-Control-Allow-Credentials", "true")

                # Authorization + CORS-safeist headers are allowed

                hadd(
                    response,
                    "Access-Control-Allow-Headers",
                    "Authorization, Accept, Accept-Language, "
                    "Content-Language, Content-Type, Range",
                )

                return response

            else:

                def set_cors_headers(request, response):
                    hadd(response, "Access-Control-Allow-Origin", origin)
                    hadd(response, "Access-Control-Allow-Credentials", "true")

                request.add_response_callback(set_cors_headers)

        # Run default request handler
        return handler(request)

    return cors_tween


SettingsComponentGap = Gap[
    Annotated[
        Literal["pyramid", "unknown"],
        Meta(description="Component identity"),
    ]
]


def settings(request, *, component: SettingsComponentGap) -> AsJSON[Dict[str, Any]]:
    comp = request.env.components[component]
    return comp.client_settings(request)


def route(request) -> AsJSON[Dict[str, Annotated[List[str], Meta(min_length=1)]]]:
    """Read route metadata"""
    return request.env.pyramid.route_meta


def pkg_version(request) -> AsJSON[Dict[str, str]]:
    """Read packages versions"""
    return {pn: p.version for pn, p in request.env.packages.items()}


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
    request.require_administrator()

    result = dict()
    for comp in request.env.components.values():
        if hasattr(comp, "query_stat"):
            result[comp.identity] = comp.query_stat()
    return result


class StorageNotConfigured(NotConfigured):
    message = _("Storage management is not enabled on this server.")


@inject()
def require_storage_enabled(*, core: CoreComponent):
    if not core.options["storage.enabled"]:
        raise StorageNotConfigured


def storage_estimate(request) -> EmptyObject:
    request.require_administrator()
    require_storage_enabled()
    request.env.core.start_estimation()


class StorageStatusResponse(Struct, kw_only=True):
    estimation_running: bool


@inject()
def storage_status(request, *, core: CoreComponent) -> StorageStatusResponse:
    request.require_administrator()
    require_storage_enabled()
    return StorageStatusResponse(estimation_running=core.estimation_running())


class StorageResponseValue(Struct, kw_only=True):
    estimated: Optional[Annotated[datetime, Meta(tz=False)]]
    updated: Optional[Annotated[datetime, Meta(tz=False)]]
    data_volume: Annotated[int, Meta(gt=0)]


@inject()
def storage(request, *, core: CoreComponent) -> AsJSON[Dict[str, StorageResponseValue]]:
    request.require_administrator()
    require_storage_enabled()
    return {kod: StorageResponseValue(**data) for kod, data in core.query_storage().items()}


def kind_of_data(request) -> AsJSON[Dict[str, str]]:
    request.require_administrator()
    return {k: request.translate(v.display_name) for k, v in KindOfData.registry.items()}


# Component settings machinery

SType = Type
SValue = Any


class csetting:
    component: str
    name: str

    gtype: SType
    stype: SType
    default: SValue
    skey: Tuple[str, str]
    ckey: Union[bool, Tuple[str, str]]

    registry: ClassVar[Dict[str, Dict[str, "csetting"]]] = dict()

    def __init__(
        self,
        name: str,
        type: Union[Any, Tuple[Any, Any]],
        *,
        default: Any = None,
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
    get_parameters = list()

    for component, stngs in csetting.registry.items():
        sitems = list(stngs.items())
        basename = Component.registry[component].basename

        rfields.append(
            fld_unset(
                component,
                defstruct(
                    f"{basename}SettingsRead",
                    [fld_unset(name, stng.gtype) for name, stng in sitems],
                ),
            )
        )

        ufields.append(
            fld_unset(
                component,
                defstruct(
                    f"{basename}SettingsUpdate",
                    [fld_reset(name, stng.stype) for name, stng in sitems],
                ),
            )
        )

        getters[component] = {k: v.getter for k, v in sitems}
        setters[component] = {k: v.setter for k, v in sitems}

        cstype = Annotated[
            List[Enum(f"{basename}SettingsEnum", dict(all="all", **{k: k for k in stngs}))],
            Meta(description=f"{basename} component settings to read"),
        ]
        get_parameters.append(
            Parameter(
                component,
                Parameter.KEYWORD_ONLY,
                default=[],
                annotation=cstype,
            )
        )

    if TYPE_CHECKING:
        CSettingsRead = Struct
        CSettingsUpadate = Struct
    else:
        CSettingsRead = defstruct("ComponentSettingsRead", rfields)
        CSettingsUpadate = defstruct("ComponentSettingUpdate", ufields)

    def get(request, **kwargs) -> CSettingsRead:
        """Read component settings"""

        request.require_administrator()

        sf = dict()
        for cid, attrs in kwargs.items():
            cgetters = getters[cid]

            attrs = [a.value for a in attrs]
            if "all" in attrs:
                if len(attrs) > 1:
                    raise ValidationError(
                        message=_(
                            "The '{}' query parameter should not contain "
                            "additional values if 'all' is specified."
                        ).format(cid)
                    )
                else:
                    attrs = list(cgetters)

            sf[cid] = {a: cgetters[a]() for a in attrs}

        return CSettingsRead(**sf)

    # Patch signature to get parameter extraction working
    get_sig = signature(get)
    get.__signature__ = get_sig.replace(
        parameters=[get_sig.parameters["request"]] + get_parameters
    )

    def put(request, *, body: CSettingsUpadate) -> EmptyObject:
        """Update component settings"""

        request.require_administrator()

        for cid, csetters in setters.items():
            if (cvalue := getattr(body, cid)) is not UNSET:
                for sid, loader in csetters.items():
                    if (abody := getattr(cvalue, sid)) is not UNSET:
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


class header_logo(csetting):
    vtype = (bytes, FileUploadRef)
    skey = (COMP_ID, "logo")
    ckey = True

    def normalize(self, value: FileUploadRef) -> Optional[bytes]:
        fupload = value()
        if fupload.size > 64 * 1024:
            raise ValidationError(message=_("64K should be enough for a logo."))
        return value().data_path.read_bytes()


class GoogleAnalytics(Struct):
    id: str


class YandexMetrica(Struct):
    id: str
    webvisor: bool


class MetricsSettings(Struct):
    google_analytics: Union[GoogleAnalytics, UnsetType] = UNSET
    yandex_metrica: Union[YandexMetrica, UnsetType] = UNSET


csetting("full_name", Optional[str], skey=("core", "system.full_name"))
csetting("home_path", Optional[str])
csetting("metrics", MetricsSettings, default={})


def setup_pyramid(comp, config):
    config.add_request_method(check_origin)

    config.add_tween(
        "nextgisweb.pyramid.api.cors_tween_factory",
        under=("nextgisweb.pyramid.exception.handled_exception_tween_factory", "INGRESS"),
    )

    comps = comp.env.components.values()
    comp_ids = [comp.identity for comp in comps if hasattr(comp, "client_settings")]
    fillgap(SettingsComponentGap, Literal[tuple(comp_ids)])  # type: ignore

    config.add_route(
        "pyramid.settings",
        "/api/component/pyramid/settings",
        get=settings,
    )

    config.add_route(
        "pyramid.route",
        "/api/component/pyramid/route",
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
        "pyramid.statistics",
        "/api/component/pyramid/statistics",
        get=statistics,
    )

    config.add_route(
        "pyramid.estimate_storage",
        "/api/component/pyramid/storage/estimate",
        post=storage_estimate,
    )

    config.add_route(
        "pyramid.storage_status",
        "/api/component/pyramid/storage/status",
        get=storage_status,
    )

    config.add_route(
        "pyramid.storage",
        "/api/component/pyramid/storage",
        get=storage,
    )

    config.add_route(
        "pyramid.kind_of_data",
        "/api/component/pyramid/kind_of_data",
        get=kind_of_data,
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
        description=_("Your Web GIS at nextgis.com"),
    )

    comp.preview_link_view = preview_link_view

    # TODO: Add PUT method for changing custom_css setting and GUI
