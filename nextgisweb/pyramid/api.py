import re
from datetime import datetime
from enum import Enum
from inspect import Parameter, signature
from typing import TYPE_CHECKING, Annotated, Any, ClassVar, Literal, NewType, Type, Union

from msgspec import UNSET, Meta, Struct, UnsetType, convert, defstruct, field, to_builtins
from pyramid.response import Response

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
from nextgisweb.lib.datetime import utcnow_naive
from nextgisweb.lib.imptool import module_from_stack

from nextgisweb.auth import Permission
from nextgisweb.core import CoreComponent, KindOfData
from nextgisweb.core.exception import NotConfigured, ValidationError
from nextgisweb.core.fontconfig import FONT_MAX_SIZE, FONT_PATTERN, CustomFont, FontKey, SystemFont
from nextgisweb.file_upload import FileUpload, FileUploadRef
from nextgisweb.jsrealm import TSExport
from nextgisweb.resource import Resource, ResourceScope

from . import client
from .client import client_setting
from .component import PyramidComponent
from .permission import cors_manage, cors_view
from .tomb.response import UnsafeFileResponse
from .util import gensecret, restart_delayed

LOGO_MAX_SIZE = 128 * (1 << 10)  # 128 KB


SettingsComponentGap = Annotated[
    Gap("SettingsComponentGap", str),
    Meta(description="Component identity"),
]

SettingsResponseTypedGap = Gap("SettingsResponseTypedGap", Type[Struct])
SettingsResponseUntyped = NewType("SettingsResponseUntyped", dict[str, Any])


def settings(
    request,
    *,
    component: SettingsComponentGap,
) -> AsJSON[AnyOf[SettingsResponseTypedGap, SettingsResponseUntyped]]:
    """Read component settings

    :returns: Current component settings"""
    comp = request.env.components[component]
    if st := request.env.pyramid._client_settings_struct_types.get(component):
        comp = request.env.components[component]
        return client.evaluate(comp, request, struct_type=st)
    return comp.client_settings(request)


def setup_pyramid_client_settings(comp, config):
    struct_types = dict[str, Any]()
    comp_ids = tuple[str]()
    for comp_id, comp_obj in comp.env.components.items():
        if comp_struct_type := client.struct_type(comp_obj):
            struct_types[comp_id] = comp_struct_type
            assert not hasattr(comp_obj, "client_settings")
        elif not hasattr(comp_obj, "client_settings"):
            continue
        comp_ids = (*comp_ids, comp_id)

    fillgap(
        SettingsComponentGap,
        Literal[comp_ids],
    )

    fillgap(
        SettingsResponseTypedGap,
        Annotated[
            Union[tuple(struct_types.values())],
            TSExport("PyramidSettingsResponseTyped"),
        ],
    )

    comp._client_settings_struct_types = struct_types

    config.add_route(
        "pyramid.settings",
        "/api/component/pyramid/settings",
        get=settings,
    )


def route(request) -> AsJSON[dict[str, Annotated[list[str], Meta(min_length=1)]]]:
    """Read route metadata

    :returns: Route metadata including name, path, and parameters"""
    return request.env.pyramid.route_meta


def pkg_version(request) -> AsJSON[dict[str, str]]:
    """Read packages versions

    :returns: Map of installed package names to their versions"""
    return {pn: p.version for pn, p in request.env.packages.items()}


class PingResponse(Struct, kw_only=True):
    current: float
    started: float


def ping(request) -> PingResponse:
    """Simple but useful request

    :returns: Pong response confirming the server is alive"""
    return PingResponse(
        current=utcnow_naive().timestamp(),
        started=request.registry.settings["pyramid.started"],
    )


class HealthcheckResponse(Struct, kw_only=True):
    success: bool
    component: dict[str, Any]


def healthcheck(
    request,
) -> AnyOf[
    Annotated[HealthcheckResponse, StatusCode(200)],
    Annotated[HealthcheckResponse, StatusCode(503)],
]:
    """Run healtchecks and return the result

    :returns: Health check results"""
    result = HealthcheckResponse(success=True, component=dict())
    components = [comp for comp in env.components.values() if hasattr(comp, "healthcheck")]
    for comp in components:
        cresult = comp.healthcheck()
        result.success = result.success and cresult["success"]
        result.component[comp.identity] = cresult

    if not result.success:
        request.response.status_code = 503

    return result


def statistics(request) -> AsJSON[dict[str, dict[str, Any]]]:
    """Compute and provide per-component statistics

    :returns: Per-component statistics"""
    request.require_administrator()

    result = dict()
    for comp in request.env.components.values():
        if hasattr(comp, "query_stat"):
            result[comp.identity] = comp.query_stat()
    return result


KindOfDataResponse = Gap("KindOfDataResponse", Type[Struct])


def kind_of_data(request) -> KindOfDataResponse:
    """Read available kinds of data schema

    :returns: Schema describing available data kinds"""

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
    """Check for storage estimation status

    :returns: Current storage estimation status"""
    request.require_administrator()
    require_storage_enabled()

    return StorageEstimateGetResponse(active=core.estimation_running())


def storage_estimate_post(request) -> EmptyObject:
    """Start full storage estimation

    :returns: Storage estimation job started"""
    request.require_administrator()
    require_storage_enabled()

    request.env.core.start_estimation()


StorageResponse = Gap("StorageResponse", Type[Struct])


class StorageValue(Struct, kw_only=True):
    estimated: Annotated[datetime, Meta(tz=False)] | None
    updated: Annotated[datetime, Meta(tz=False)] | None
    data_volume: Annotated[int, Meta(gt=0)]


@inject()
def storage(request, *, core: CoreComponent) -> StorageResponse:
    """Read storage usage

    :returns: Storage usage summary"""
    request.require_administrator()
    require_storage_enabled()

    data = core.query_storage()
    if "" in data:
        data = {"total": data.pop(""), **data}

    return StorageResponse(**{k: StorageValue(**v) for k, v in data.items()})


def font_cread(request) -> AsJSON[list[SystemFont | CustomFont]]:
    """Get information about available fonts

    :returns: List of available fonts"""
    request.require_administrator()
    unordered = request.env.core.fontconfig.enumerate()
    return sorted(unordered, key=lambda i: (not isinstance(i, CustomFont), i.label))


class FontCUpdateBody(Struct, kw_only=True):
    add: list[FileUploadRef] = field(default_factory=list)
    remove: list[FontKey] = field(default_factory=list)


class FontCUpdateResponse(Struct, kw_only=True):
    restarted: bool
    timestamp: float


def font_cupdate(request, *, body: FontCUpdateBody) -> FontCUpdateResponse:
    """Add or remove custom fonts

    :returns: Updated list of available fonts"""

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
        timestamp=utcnow_naive().timestamp(),
    )


@inject()
def codegen_api_type(
    request, *, pyramid: PyramidComponent
) -> Annotated[Response, ContentType("application/typescript")]:
    """Return autogenerated TypeScript API type definitions

    :returns: TypeScript type definitions for the API"""

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
    read: Permission | None
    write: Permission | None
    skey: tuple[str, str]
    ckey: bool | tuple[str, str]

    registry: ClassVar[dict[str, dict[str, "csetting"]]] = dict()

    def __init__(
        self,
        name: str,
        type: Any | tuple[Any, Any],
        *,
        default: Any = None,
        read: Permission | None = None,
        write: Permission | None = None,
        skey: tuple[str, str] | None = None,
        ckey: bool | tuple[str, str] | None = None,
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

    def normalize(self, value: SValue) -> SValue | None:
        return value

    @inject()
    def getter(self, *, core: CoreComponent) -> SValue:
        try:
            value = core.settings_get(*self.skey)
        except KeyError:
            return self.default
        return convert(value, self.gtype)

    @inject()
    def setter(self, value: SValue | None, *, core: CoreComponent):
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
    fld_unset = lambda n, t: (n, t | UnsetType, UNSET)
    fld_reset = lambda n, t: (n, t | NoneDefault | UnsetType, UNSET)

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
            list[Annotated[cslit, TSExport(f"{basename}CSetting", component=cid)]],
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
        """Read component settings

        :returns: Current component settings"""

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
        """Update component settings

        :returns: Updated component settings"""

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
    list[Annotated[str, Meta(pattern=ORIGIN_RE)]],
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

    def normalize(self, value: AllowOrigin) -> AllowOrigin | None:
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

    def normalize(self, value: str) -> str | None:
        if re.match(r"^\s*$", value, re.MULTILINE):
            return None
        return value


class LogoMimeType(Enum):
    PNG = "image/png"
    SVG = "image/svg+xml"


class header_logo(csetting):
    vtype = (tuple[LogoMimeType, bytes], FileUploadRef)
    skey = (COMP_ID, "logo")
    ckey = True

    def normalize(self, value: FileUploadRef) -> tuple[LogoMimeType, bytes] | None:
        fupload = value()
        try:
            mime_type = LogoMimeType(fupload.mime_type)
        except ValueError:
            msg = gettextf("Got an unsupported MIME type: '{}'.")(fupload.mime_type)
            raise ValidationError(msg)
        if fupload.size > LOGO_MAX_SIZE:
            msg = gettextf("{}KiB should be enough for a logo.")(LOGO_MAX_SIZE // 1024)
            raise ValidationError(msg)
        return mime_type, value().data_path.read_bytes()


class GoogleAnalytics(Struct):
    id: str


class YandexMetrica(Struct):
    id: str
    webvisor: bool


class Metrics(Struct):
    google_analytics: GoogleAnalytics | UnsetType = UNSET
    yandex_metrica: YandexMetrica | UnsetType = UNSET


csetting("full_name", str | None, skey=("core", "system.full_name"))
csetting("home_path", str | None)
csetting("metrics", Metrics, default={})


@client_setting("logoMaxSize")
def cs_logo_max_size(comp: PyramidComponent, request) -> int:
    return LOGO_MAX_SIZE


def setup_pyramid(comp, config):
    from . import api_cors

    config.include(api_cors)

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
        get=kind_of_data,
    )

    fillgap(
        StorageResponse,
        defstruct(
            "StorageResponse",
            [
                (
                    "total",
                    Annotated[StorageValue | UnsetType, Meta(description="Total storage usage")],
                    UNSET,
                )
            ]
            + [(i, StorageValue | UnsetType, UNSET) for i in KindOfData.registry.keys()],
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
