from inspect import signature
from pathlib import Path
from shutil import which
from subprocess import check_call
from tempfile import TemporaryDirectory
from typing import TYPE_CHECKING, Annotated, Any, ForwardRef, Literal, TypeAlias, cast

from geoalchemy2.shape import to_shape
from msgspec import UNSET, Meta, Struct, UnsetType, ValidationError
from pyramid.httpexceptions import HTTPNotFound
from pyramid.renderers import render
from pyramid.response import Response

from nextgisweb.env import DBSession
from nextgisweb.lib.apitype.util import EmptyObject
from nextgisweb.lib.safehtml import sanitize

from nextgisweb.feature_layer import IFeatureLayer
from nextgisweb.jsrealm import TSExport
from nextgisweb.layer import IBboxLayer
from nextgisweb.pyramid import AsJSON, JSONType
from nextgisweb.pyramid.api import csetting
from nextgisweb.render import IRenderableScaleRange
from nextgisweb.render.legend import ILegendSymbols
from nextgisweb.render.util import scale_range_intersection
from nextgisweb.resource import DataScope, ResourceFactory, ResourceRef, ResourceScope

from .adapter import WebMapAdapter
from .model import ExtentWSEN, LegendSymbolsEnum, WebMap, WebMapAnnotation, WebMapScope
from .option import WebMapOption
from .plugin import WebmapLayerPlugin, WebmapPlugin

AnnotationID = Annotated[int, Meta(ge=1, description="Annotation ID")]


class AnnotationRead(Struct, kw_only=True):
    id: AnnotationID
    geom: str
    public: bool
    own: bool
    description: str | None
    style: dict[str, Any] | None
    user_id: int | UnsetType = UNSET
    user: str | UnsetType = UNSET


class AnnotationCreate(Struct, kw_only=True):
    geom: str
    public: bool
    description: str | UnsetType = UNSET
    style: dict[str, Any] | UnsetType = UNSET


class AnnotationUpdate(Struct, kw_only=True):
    description: str | UnsetType = UNSET
    style: dict[str, Any] | UnsetType = UNSET
    geom: str | UnsetType = UNSET


class AnnotationCreateResponse(Struct, kw_only=True):
    id: AnnotationID


def to_annot_read(obj: WebMapAnnotation, request, with_user_info=False) -> AnnotationRead:
    user_id = request.user.id

    annotation_read = AnnotationRead(
        id=obj.id,
        description=obj.description,
        style=obj.style,
        geom=to_shape(obj.geom).wkt,
        public=obj.public,
        own=user_id == obj.user_id,
    )

    if with_user_info and (obj.public is False):
        annotation_read.user_id = obj.user_id
        annotation_read.user = obj.user.display_name if obj.user else UNSET

    return annotation_read


def prepare_annotation(
    obj: WebMapAnnotation,
    data: AnnotationCreate | AnnotationUpdate,
) -> None:
    if isinstance(data, AnnotationCreate):
        obj.public = data.public

    if data.geom is not UNSET and data.geom:
        obj.geom = f"SRID=3857;{data.geom}"

    obj.style = data.style if data.style is not UNSET else None
    obj.description = sanitize(data.description) if data.description is not UNSET else None


def check_annotation_enabled(request) -> None:
    if not request.env.webmap.options["annotation"]:
        raise HTTPNotFound()


def annotation_cget(resource, request) -> AsJSON[list[AnnotationRead]]:
    """Read annotations"""
    check_annotation_enabled(request)
    request.resource_permission(WebMapScope.annotation_read)

    if resource.has_permission(WebMapScope.annotation_manage, request.user):
        return [to_annot_read(a, request, with_user_info=True) for a in resource.annotations]

    return [
        to_annot_read(a, request)
        for a in resource.annotations
        if a.public or (not a.public and a.user_id == request.user.id)
    ]


def annotation_cpost(
    resource,
    request,
    *,
    body: AnnotationCreate,
) -> AnnotationCreateResponse:
    """Create annotation"""
    check_annotation_enabled(request)
    request.resource_permission(WebMapScope.annotation_write)

    obj = WebMapAnnotation()
    prepare_annotation(obj, body)
    if not obj.public:
        obj.user_id = request.user.id
    resource.annotations.append(obj)
    DBSession.flush()
    return AnnotationCreateResponse(id=obj.id)


def annotation_iget(
    resource,
    request,
    annotation_id: int,
) -> AsJSON[AnnotationRead]:
    """Read annotation"""
    check_annotation_enabled(request)
    request.resource_permission(WebMapScope.annotation_read)

    obj = WebMapAnnotation.filter_by(webmap_id=resource.id, id=annotation_id).one()
    with_user_info = resource.has_permission(WebMapScope.annotation_manage, request.user)
    return to_annot_read(obj, request, with_user_info)


def annotation_iput(
    resource,
    request,
    annotation_id: int,
    *,
    body: AnnotationUpdate,
) -> AnnotationCreateResponse:
    """Update annotation"""
    check_annotation_enabled(request)
    request.resource_permission(WebMapScope.annotation_write)

    obj = WebMapAnnotation.filter_by(webmap_id=resource.id, id=annotation_id).one()
    prepare_annotation(obj, body)
    return AnnotationCreateResponse(id=obj.id)


def annotation_idelete(
    resource,
    request,
    annotation_id: int,
) -> EmptyObject:
    """Delete annotation"""
    check_annotation_enabled(request)
    request.resource_permission(WebMapScope.annotation_write)

    obj = WebMapAnnotation.filter_by(webmap_id=resource.id, id=annotation_id).one()
    DBSession.delete(obj)


def add_extent(e1, e2):
    def is_valid(extent):
        if not extent:
            return False
        for k, v in extent.items():
            if v is None:
                return False
        return True

    e1_valid = is_valid(e1)
    e2_valid = is_valid(e2)
    if (not e1_valid) or (not e2_valid):
        return (e2 if e2_valid else None) or (e1 if e1_valid else None)

    return dict(
        minLon=min(e1["minLon"], e2["minLon"]),
        maxLon=max(e1["maxLon"], e2["maxLon"]),
        minLat=min(e1["minLat"], e2["minLat"]),
        maxLat=max(e1["maxLat"], e2["maxLat"]),
    )


def get_webmap_extent(resource, request) -> JSONType:
    """Calculate webmap layers' extent"""
    request.resource_permission(ResourceScope.read)

    def traverse(item, extent):
        if item.item_type == "layer":
            if res := item.style.lookup_interface(IBboxLayer):
                if not res.has_permission(DataScope.read, request.user):
                    return extent
                extent = add_extent(extent, res.extent)
        elif item.item_type in ("root", "group"):
            for i in item.children:
                extent = traverse(i, extent)
        return extent

    return traverse(resource.root_item, None)


PrintFormat = Annotated[Literal["png", "jpeg", "tiff", "pdf"], TSExport("PrintFormat")]


class ElementSize(Struct):
    x: Annotated[float, Meta()]
    y: Annotated[float, Meta()]
    width: Annotated[float, Meta(gt=0)]
    height: Annotated[float, Meta(gt=0)]


class ElementContent(ElementSize):
    content: str


if TYPE_CHECKING:
    LegendTreeNodeAlias: TypeAlias = "LegendTreeNode"
else:
    LegendTreeNodeAlias = ForwardRef("LegendTreeNode")


class LegendTreeNode(Struct):
    title: str
    is_group: bool
    is_legend: bool
    children: list[LegendTreeNodeAlias]
    icon: str | UnsetType = UNSET


class LegendElement(ElementSize):
    legend_columns: Annotated[int, Meta()]
    legend_items: list[LegendTreeNode] | UnsetType = UNSET


class MapContent(ElementSize):
    content: bytes


class PrintBody(Struct):
    width: Annotated[int, Meta(gt=0)]
    height: Annotated[int, Meta(gt=0)]
    margin: Annotated[int, Meta(ge=0)]
    map: MapContent
    format: PrintFormat
    legend: LegendElement | UnsetType = UNSET
    title: ElementContent | UnsetType = UNSET


class LegendViewModel(Struct):
    title: str
    level: int
    group: bool
    legend: bool
    icon: str | UnsetType = UNSET


def to_legend_view_model(legend_node: LegendTreeNode, level: int) -> LegendViewModel:
    if legend_node.is_legend:
        level = level - 1
    return LegendViewModel(
        title=legend_node.title,
        level=level,
        group=legend_node.is_group,
        legend=legend_node.is_legend,
        icon=legend_node.icon,
    )


def handle_legend_node(
    node: LegendTreeNode, level: int, legend_tree: list[LegendViewModel]
) -> None:
    legend_tree.append(to_legend_view_model(node, level))
    for child in node.children:
        handle_legend_node(child, level + 1, legend_tree)


def handle_legend_tree(legend: LegendElement) -> list[LegendViewModel]:
    if legend.legend_items is UNSET:
        return []
    nodes: list[LegendTreeNode] = legend.legend_items
    legend_tree: list[LegendViewModel] = []
    for node in nodes:
        handle_legend_node(node, 0, legend_tree)
    return legend_tree


def check_page_max_size(request, body: PrintBody):
    max_size = request.env.webmap.options["print.max_size"]
    if body.height > max_size:
        raise ValidationError(
            f"Height must be less than or equal to S{max_size}. Provided height: {body.height}"
        )
    if body.width > max_size:
        raise ValidationError(
            f"Width must be less than or equal to {max_size}. Provided width: {body.width}"
        )


def print(request, *, body: PrintBody) -> Response:
    """Generate printable webmap document"""
    check_page_max_size(request, body)
    with TemporaryDirectory() as temp_name:
        temp_dir = Path(temp_name)

        map_image_file = temp_dir / "img.png"
        map_image_file.write_bytes(body.map.content)

        legend = body.legend
        legend_tree_items = None
        if legend is not UNSET:
            legend_tree_items = handle_legend_tree(legend)
            if not legend.legend_columns:
                legend.legend_columns = 1
        title_map = body.title if body.title is not UNSET else None

        index_html = temp_dir / "index.html"
        index_html.write_text(
            render(
                "template/print.mako",
                {
                    "width": int(body.width),
                    "height": int(body.height),
                    "margin": int(body.margin),
                    "map": body.map,
                    "map_image": map_image_file.relative_to(temp_dir),
                    "legend": legend,
                    "legend_tree_items": legend_tree_items,
                    "title": title_map,
                },
                request,
            )
        )

        output_pdf = temp_dir / "output.pdf"
        check_call(
            [
                "chromium-browser",
                "--headless",
                "--no-sandbox",
                "--disable-gpu",
                "--run-all-compositor-stages-before-draw",
                "--virtual-time-budget=10000",
                "--disable-dev-shm-usage",
                "--no-pdf-header-footer",
                f"--print-to-pdf={output_pdf}",
                f"{index_html}",
            ]
        )

        output_file = None
        content_type = None
        if body.format == "pdf":
            output_file = output_pdf
            content_type = "application/pdf"
        else:
            content_type, output_file = pdf_to_image(body.format, output_pdf, temp_dir)

        return Response(
            app_iter=output_file.open("rb"),
            content_type=content_type,
            request=request,
        )


def pdf_to_image(format: PrintFormat, pdf_file: str, temp_dir: TemporaryDirectory):
    gs = which("gs")
    if not gs:
        raise RuntimeError("Ghostscript not found")

    output_file = None
    content_type = None
    device = None

    if format == "jpeg":
        content_type = "image/jpeg"
        output_file = temp_dir / "output.jpeg"
        device = "jpeg"
    elif format == "png":
        content_type = "image/png"
        output_file = temp_dir / "output.png"
        device = "png16m"
    elif format == "tiff":
        content_type = "image/tiff"
        output_file = temp_dir / "output.tiff"
        device = "tiff24nc"
    else:
        raise ValueError(f"Wrong image fromat to export: {format}")

    check_call(
        [
            gs,
            "-q",
            "-dBATCH",
            "-dSAFER",
            "-dNOPAUSE",
            "-r96",
            "-dDownScaleFactor=1",
            f"-sDEVICE={device}",
            f"-sOutputFile={output_file}",
            pdf_file,
        ]
    )

    return (content_type, output_file)


# Component settings

LengthUnits = Annotated[
    Literal["m", "km", "metric", "ft", "mi", "imperial"], TSExport("LengthUnits")
]
AreaUnits = Annotated[
    Literal["sq_m", "sq_km", "metric", "ha", "ac", "sq_mi", "imperial", "sq_ft"],
    TSExport("AreaUnits"),
]
DegreeFormat = Annotated[Literal["dd", "ddm", "dms"], TSExport("DegreeFormat")]
AddressGeocoder = Annotated[Literal["nominatim", "yandex"], TSExport("AddressGeocoder")]

csetting("identify_radius", float, default=3)
csetting("identify_attributes", bool, default=True)
csetting("show_geometry_info", bool, default=False)
csetting("address_search_enabled", bool, default=True)
csetting("address_search_extent", bool, default=False)
csetting("address_geocoder", AddressGeocoder, default="nominatim")
csetting("yandex_api_geocoder_key", str | None, default=None)
csetting("nominatim_countrycodes", str | None, default=None)
csetting("units_length", LengthUnits, default="m")
csetting("units_area", AreaUnits, default="sq_m")
csetting("degree_format", DegreeFormat, default="dd")
csetting("measurement_srid", int, default=4326)
csetting("legend_symbols", str | None, default=None)
csetting("hide_nav_menu", bool, default=False)


AnnotationVisibleMode = Literal["no", "yes", "messages"]
LegendVisibleMode = Literal["collapse", "expand"]


class LegendInfo(Struct, kw_only=True):
    visible: LegendVisibleMode
    has_legend: bool


class AnnotationsPermissions(Struct, kw_only=True):
    read: bool
    write: bool
    manage: bool


class AnnotationsConfig(Struct, kw_only=True):
    enabled: bool
    default: AnnotationVisibleMode
    scope: AnnotationsPermissions


class MidConfig(Struct, kw_only=True):
    adapter: set[str]
    plugin: set[str]


class BaseItem(Struct, kw_only=True):
    id: int
    key: int
    label: str
    title: str


class LayerIdentification(Struct, kw_only=True):
    mode: Literal["feature_layer", "raster_layer"]
    resource: ResourceRef


class LayerItemConfig(BaseItem, tag="layer", tag_field="type"):
    layerId: int
    styleId: int
    visibility: bool
    identifiable: bool
    transparency: float | None
    minScaleDenom: float | None
    maxScaleDenom: float | None
    drawOrderPosition: int | None
    legendInfo: LegendInfo
    adapter: str
    plugin: dict[str, Any]
    minResolution: float | None = None
    maxResolution: float | None = None
    editable: bool | None = None
    identification: LayerIdentification | None = None


class GroupItemConfig(BaseItem, tag="group", tag_field="type"):
    expanded: bool
    exclusive: bool
    children: "list[GroupItemConfig | LayerItemConfig]"


class RootItemConfig(BaseItem, tag="root", tag_field="type"):
    children: list[GroupItemConfig | LayerItemConfig]


class DisplayConfig(Struct, kw_only=True):
    webmapId: int
    webmapTitle: str
    webmapPlugin: dict[str, Any]
    initialExtent: ExtentWSEN
    constrainingExtent: ExtentWSEN | None
    rootItem: RootItemConfig
    checkedItems: set[int]
    expandedItems: set[int]
    mid: MidConfig
    annotations: AnnotationsConfig
    webmapDescription: str
    webmapEditable: bool
    webmapLegendVisible: str
    drawOrderEnabled: Any | None = None
    measureSrsId: int | None = None
    # units: str
    printMaxSize: int
    bookmarkLayerId: Any | None = None
    options: dict[str, bool]


def _extent_wsen_from_attrs(obj, prefix) -> ExtentWSEN | None:
    attrs = tuple((prefix + i) for i in ("left", "bottom", "right", "top"))
    parts = [getattr(obj, a) for a in attrs]
    return ExtentWSEN(*parts) if None not in parts else None


def display_config(obj, request) -> DisplayConfig:
    """Generate webmap display widget configuration"""
    request.resource_permission(ResourceScope.read)

    # Map level plugins
    plugin = dict()
    for p_cls in WebmapPlugin.registry:
        if p_mid_data := p_cls.is_supported(obj):
            p_mid, p_payload = p_mid_data
            plugin[p_mid] = p_payload

    ls_webmap = request.env.webmap.effective_legend_symbols() + obj.legend_symbols

    def _legend(layer, style):
        ls_layer = ls_webmap + obj.legend_symbols + layer.legend_symbols
        result = dict(visible=ls_layer)
        if ls_layer in (LegendSymbolsEnum.EXPAND, LegendSymbolsEnum.COLLAPSE):
            result["has_legend"] = ILegendSymbols.providedBy(style)

        return result

    mid = MidConfig(adapter=set(), plugin=set())
    checked_items: set[int] = set()
    expanded_items: set[int] = set()

    def traverse(item):
        data = dict(
            id=item.id,
            key=item.id,
            type=item.item_type,
            label=item.display_name,
            title=item.display_name,
        )

        if item.item_type == "layer":
            style = item.style
            layer = style.parent if style.cls.endswith("_style") else style

            if not style.has_permission(DataScope.read, request.user):
                # Skip webmap item if there are no necessary permissions, so it
                # won't be shown in the tree.
                return None

            layer_enabled = bool(item.layer_enabled)
            if layer_enabled:
                checked_items.add(item.id)

            scale_range = item.scale_range()
            if IRenderableScaleRange.providedBy(style):
                scale_range = scale_range_intersection(scale_range, style.scale_range())

            legend_info = _legend(item, style)

            # Main element parameters
            data.update(
                layerId=style.parent_id,
                styleId=style.id,
                visibility=layer_enabled,
                identifiable=item.layer_identifiable,
                transparency=item.layer_transparency,
                minScaleDenom=scale_range[0],
                maxScaleDenom=scale_range[1],
                drawOrderPosition=item.draw_order_position,
                legendInfo=legend_info,
            )

            identification_mode = None
            if not item.layer_identifiable:
                pass
            elif IFeatureLayer.providedBy(layer):
                identification_mode = "feature_layer"
            elif layer.cls == "raster_layer":
                identification_mode = "raster_layer"

            data.update(
                identification=dict(
                    mode=identification_mode,
                    resource=ResourceRef(id=layer.id),
                )
                if identification_mode is not None
                else None
            )

            data["adapter"] = WebMapAdapter.registry.get(item.layer_adapter, "image").mid
            mid.adapter.add(data["adapter"])

            # Layer level plugins
            plugin = dict()
            plugin_base_kwargs = dict(layer=layer, webmap=obj)
            for pcls in WebmapLayerPlugin.registry:
                fn = pcls.is_layer_supported
                plugin_kwargs = (
                    dict(plugin_base_kwargs, style=style)
                    if "style" in signature(fn).parameters
                    else plugin_base_kwargs
                )

                if p_mid_data := fn(**plugin_kwargs):
                    p_mid, p_payload = p_mid_data
                    plugin[p_mid] = p_payload

            data.update(plugin=plugin)
            mid.plugin.update(plugin.keys())

        elif item.item_type in ("root", "group"):
            expanded = item.group_expanded
            exclusive = item.group_exclusive
            if expanded:
                expanded_items.add(item.id)

            # Recursively run all elements excluding those with no permissions
            data.update(
                expanded=expanded,
                exclusive=exclusive,
                children=list(filter(None, map(traverse, item.children))),
            )

            # Hide empty groups
            if (item.item_type in "group") and not data["children"]:
                return None

        return data

    initial_extent = _extent_wsen_from_attrs(obj, prefix="extent_")
    if initial_extent is None:
        initial_extent = ExtentWSEN(-180, -90, 180, 90)
    constraining_extent = _extent_wsen_from_attrs(obj, prefix="extent_const_")
    root_item = cast(RootItemConfig, traverse(obj.root_item))
    permissions = obj.permissions(request.user)

    options = dict()
    for k, v in WebMapOption.registry.items():
        if obj.options is not None and k in obj.options:
            options[k] = obj.options[k]
        else:
            options[k] = v.default()

    return DisplayConfig(
        webmapId=obj.id,
        webmapTitle=obj.display_name if obj.title is None else obj.title,
        webmapPlugin=plugin,
        initialExtent=initial_extent,
        constrainingExtent=constraining_extent,
        rootItem=root_item,
        checkedItems=checked_items,
        expandedItems=expanded_items,
        mid=mid,
        annotations=AnnotationsConfig(
            enabled=obj.annotation_enabled and request.env.webmap.options["annotation"],
            default=obj.annotation_default,
            scope=AnnotationsPermissions(
                read=WebMapScope.annotation_read in permissions,
                write=WebMapScope.annotation_write in permissions,
                manage=WebMapScope.annotation_manage in permissions,
            ),
        ),
        webmapDescription=obj.description,
        webmapEditable=obj.editable,
        webmapLegendVisible=obj.legend_symbols,
        drawOrderEnabled=obj.draw_order_enabled,
        measureSrsId=obj.measure_srs_id,
        bookmarkLayerId=obj.bookmark_resource_id,
        printMaxSize=request.env.webmap.options["print.max_size"],
        options=options,
    )


def setup_pyramid(comp, config):
    webmap_factory = ResourceFactory(context=WebMap)

    config.add_route(
        "webmap.annotation.collection",
        "/api/resource/{id}/annotation/",
        factory=webmap_factory,
        get=annotation_cget,
        post=annotation_cpost,
    )

    config.add_route(
        "webmap.annotation.item",
        "/api/resource/{id}/annotation/{annotation_id}",
        factory=webmap_factory,
        types=dict(annotation_id=AnnotationID),
        get=annotation_iget,
        put=annotation_iput,
        delete=annotation_idelete,
    )

    config.add_route(
        "webmap.extent",
        "/api/resource/{id}/webmap/extent",
        factory=webmap_factory,
        get=get_webmap_extent,
    )

    config.add_route(
        "webmap.print",
        "/api/component/{id}/webmap/print",
        factory=webmap_factory,
        post=print,
    )

    config.add_route(
        "webmap.display_config",
        "/api/resource/{id}/webmap/display_config",
        factory=webmap_factory,
        get=display_config,
    )

    from .option import api as option_api

    option_api.setup_pyramid(comp, config)
