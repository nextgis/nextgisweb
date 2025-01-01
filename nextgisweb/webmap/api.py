from collections import namedtuple
from inspect import signature
from pathlib import Path
from shutil import which
from subprocess import check_call
from tempfile import TemporaryDirectory
from typing import Any, Dict, List, Literal, Optional, Tuple, Union

from geoalchemy2.shape import to_shape
from msgspec import UNSET, Meta, Struct, UnsetType, ValidationError
from pyramid.httpexceptions import HTTPNotFound
from pyramid.renderers import render
from pyramid.response import Response
from typing_extensions import Annotated

from nextgisweb.env import DBSession

from nextgisweb.jsrealm import TSExport
from nextgisweb.layer import IBboxLayer
from nextgisweb.pyramid import JSONType
from nextgisweb.pyramid.api import csetting
from nextgisweb.render import IRenderableScaleRange
from nextgisweb.render.api import legend_symbols_by_resource
from nextgisweb.render.legend import ILegendSymbols
from nextgisweb.render.util import scale_range_intersection
from nextgisweb.resource import DataScope, ResourceFactory, ResourceScope

from .adapter import WebMapAdapter
from .model import LegendSymbolsEnum, WebMap, WebMapAnnotation, WebMapScope
from .plugin import WebmapLayerPlugin, WebmapPlugin

AnnotationID = Annotated[int, Meta(ge=1, description="Annotation ID")]


def annotation_to_dict(obj, request, with_user_info=False):
    result = dict()

    keys = ("id", "description", "style", "geom", "public")
    if with_user_info and (obj.public is False):
        keys = keys + (
            "user_id",
            "user",
        )

    user_id = request.user.id
    result["own"] = user_id == obj.user_id

    for k in keys:
        v = getattr(obj, k)
        if k == "geom":
            v = to_shape(v).wkt
        if k == "user" and (v is not None):
            v = v.display_name
        if v is not None:
            result[k] = v
    return result


def annotation_from_dict(obj, data):
    for k in ("description", "style", "geom", "public"):
        if k in data:
            v = data[k]
            if k == "geom":
                v = "SRID=3857;" + v
            setattr(obj, k, v)


def check_annotation_enabled(request):
    if not request.env.webmap.options["annotation"]:
        raise HTTPNotFound()


def annotation_cget(resource, request) -> JSONType:
    check_annotation_enabled(request)
    request.resource_permission(WebMapScope.annotation_read)

    if resource.has_permission(WebMapScope.annotation_manage, request.user):
        return [annotation_to_dict(a, request, with_user_info=True) for a in resource.annotations]

    return [
        annotation_to_dict(a, request)
        for a in resource.annotations
        if a.public or (not a.public and a.user_id == request.user.id)
    ]


def annotation_cpost(resource, request) -> JSONType:
    check_annotation_enabled(request)
    request.resource_permission(WebMapScope.annotation_write)
    obj = WebMapAnnotation()
    annotation_from_dict(obj, request.json_body)
    if not obj.public:
        obj.user_id = request.user.id
    resource.annotations.append(obj)
    DBSession.flush()
    return dict(id=obj.id)


def annotation_iget(resource, request) -> JSONType:
    check_annotation_enabled(request)
    request.resource_permission(WebMapScope.annotation_read)
    obj = WebMapAnnotation.filter_by(
        webmap_id=resource.id, id=int(request.matchdict["annotation_id"])
    ).one()
    with_user_info = resource.has_permission(WebMapScope.annotation_manage, request.user)
    return annotation_to_dict(obj, request, with_user_info)


def annotation_iput(resource, request) -> JSONType:
    check_annotation_enabled(request)
    request.resource_permission(WebMapScope.annotation_write)
    obj = WebMapAnnotation.filter_by(
        webmap_id=resource.id, id=int(request.matchdict["annotation_id"])
    ).one()
    annotation_from_dict(obj, request.json_body)
    return dict(id=obj.id)


def annotation_idelete(resource, request) -> JSONType:
    check_annotation_enabled(request)
    request.resource_permission(WebMapScope.annotation_write)
    obj = WebMapAnnotation.filter_by(
        webmap_id=resource.id, id=int(request.matchdict["annotation_id"])
    ).one()
    DBSession.delete(obj)
    return None


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


class LegendTreeNode(Struct):
    title: str
    is_group: bool
    is_legend: bool
    children: List["LegendTreeNode"]
    icon: Union[str, UnsetType] = UNSET


class LegendElement(ElementSize):
    legend_columns: Annotated[int, Meta()]
    legend_items: Union[List[LegendTreeNode], UnsetType] = UNSET


class MapContent(ElementSize):
    content: bytes


class PrintBody(Struct):
    width: Annotated[int, Meta(gt=0)]
    height: Annotated[int, Meta(gt=0)]
    margin: Annotated[int, Meta(ge=0)]
    map: MapContent
    format: PrintFormat
    legend: Union[LegendElement, UnsetType] = UNSET
    title: Union[ElementContent, UnsetType] = UNSET


class LegendViewModel(Struct):
    title: str
    level: int
    group: bool
    legend: bool
    icon: Union[str, UnsetType] = UNSET


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
    node: LegendTreeNode, level: int, legend_tree: List[LegendViewModel]
) -> None:
    legend_tree.append(to_legend_view_model(node, level))
    for child in node.children:
        handle_legend_node(child, level + 1, legend_tree)


def handle_legend_tree(legend: LegendElement) -> List[LegendViewModel]:
    if legend.legend_items is UNSET:
        return []
    nodes: List[LegendTreeNode] = legend.legend_items
    legend_tree: List[LegendViewModel] = []
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
csetting("popup_width", int, default=300)
csetting("popup_height", int, default=200)
csetting("address_search_enabled", bool, default=True)
csetting("address_search_extent", bool, default=False)
csetting("address_geocoder", AddressGeocoder, default="nominatim")
csetting("yandex_api_geocoder_key", Optional[str], default=None)
csetting("nominatim_countrycodes", Optional[str], default=None)
csetting("units_length", LengthUnits, default="m")
csetting("units_area", AreaUnits, default="sq_m")
csetting("degree_format", DegreeFormat, default="dd")
csetting("measurement_srid", int, default=4326)
csetting("legend_symbols", Optional[str], default=None)
csetting("hide_nav_menu", bool, default=False)


LayerType = Literal["layer", "group", "root"]
AnnotationVisibleMode = Literal["no", "yes", "messages"]
LegendVisibleMode = Literal["collapse", "expand"]
Entrypoint = Union[str, Tuple[str, Any]]


class Icon(Struct):
    format: str
    data: str


class SymbolInfo(Struct):
    index: int
    render: bool
    display_name: str
    icon: Icon


class LegendInfo(Struct):
    visible: LegendVisibleMode
    has_legend: bool
    symbols: List[SymbolInfo]
    single: bool
    open: Union[bool, None] = None


class Scope(Struct):
    read: bool
    write: bool
    manage: bool


class Annotations(Struct):
    enabled: bool
    default: AnnotationVisibleMode
    scope: Scope


class Mid(Struct):
    adapter: List[Entrypoint]
    basemap: List[Entrypoint]
    plugin: List[Entrypoint]


class ItemsStates(Struct):
    expanded: List[Any]
    checked: List[int]


class BaseItem(Struct):
    id: int
    key: int
    type: LayerType
    label: str
    title: str


class LayerItemConfig(BaseItem):
    type: Literal["layer"]
    layerId: int
    styleId: int
    visibility: bool
    identifiable: bool
    transparency: Union[float, None]
    minScaleDenom: Union[float, None]
    maxScaleDenom: Union[float, None]
    drawOrderPosition: Union[int, None]
    legendInfo: LegendInfo
    adapter: str
    plugin: Dict[str, Any]
    minResolution: Union[float, None] = None
    maxResolution: Union[float, None] = None
    editable: Union[bool, None] = None


class GroupItemConfig(BaseItem):
    type: Literal["group"]
    expanded: bool
    exclusive: bool
    children: List[Union["GroupItemConfig", LayerItemConfig]]


class RootItemConfig(BaseItem):
    type: Literal["root"]
    children: List[Union[GroupItemConfig, LayerItemConfig]]


TreeItemConfig = Union[RootItemConfig, GroupItemConfig, LayerItemConfig]
TreeChildrenItemConfig = Union[GroupItemConfig, LayerItemConfig]


class DisplayConfig(Struct, kw_only=True):
    extent: Tuple[float, float, float, float]
    extent_const: Tuple[
        Union[float, None], Union[float, None], Union[float, None], Union[float, None]
    ]
    rootItem: RootItemConfig
    itemsStates: ItemsStates
    mid: Mid
    webmapPlugin: Dict[str, Any]
    bookmarkLayerId: Union[Any, None] = None
    webmapId: int
    webmapDescription: str
    webmapTitle: str
    webmapEditable: bool
    webmapLegendVisible: str
    drawOrderEnabled: Union[Any, None] = None
    annotations: Annotations
    # units: str
    printMaxSize: int
    measureSrsId: Union[int, None] = None


def display_config(obj, request) -> DisplayConfig:
    request.resource_permission(ResourceScope.read)

    MID = namedtuple("MID", ["adapter", "basemap", "plugin"])

    mid = MID(
        set(),
        set(),
        set(),
    )

    # Map level plugins
    plugin = dict()
    for pcls in WebmapPlugin.registry:
        p_mid_data = pcls.is_supported(obj)
        if p_mid_data:
            plugin.update((p_mid_data,))

    items_states = {
        "expanded": [],
        "checked": [],
    }

    ls_webmap = request.env.webmap.effective_legend_symbols() + obj.legend_symbols

    def _legend(layer, style):
        ls_layer = ls_webmap + obj.legend_symbols + layer.legend_symbols
        result = dict(visible=ls_layer)
        if ls_layer in (LegendSymbolsEnum.EXPAND, LegendSymbolsEnum.COLLAPSE):
            has_legend = result["has_legend"] = ILegendSymbols.providedBy(style)
            if has_legend:
                legend_symbols = legend_symbols_by_resource(style, 20, request.translate)
                result.update(symbols=legend_symbols)
                is_single = len(legend_symbols) == 1
                result.update(single=is_single)
                if not is_single:
                    result.update(open=ls_layer == LegendSymbolsEnum.EXPAND)

        return result

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
                return None

            # If there are no necessary permissions skip web-map element
            # so it won't be shown in the tree

            # TODO: Security

            # if not layer.has_permission(
            #     request.user,
            #     'style-read',
            #     'data-read',
            # ):
            #     return None

            layer_enabled = bool(item.layer_enabled)
            if layer_enabled:
                items_states.get("checked").append(item.id)

            scale_range = item.scale_range()
            if IRenderableScaleRange.providedBy(style):
                scale_range = scale_range_intersection(scale_range, style.scale_range())

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
                legendInfo=_legend(item, style),
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
                p_mid_data = fn(**plugin_kwargs)
                if p_mid_data:
                    plugin.update((p_mid_data,))

            data.update(plugin=plugin)
            mid.plugin.update(plugin.keys())

        elif item.item_type in ("root", "group"):
            expanded = item.group_expanded
            exclusive = item.group_exclusive
            if expanded:
                items_states.get("expanded").append(item.id)
            # Recursively run all elements excluding those
            # with no permissions
            data.update(
                expanded=expanded,
                exclusive=exclusive,
                children=list(filter(None, map(traverse, item.children))),
            )
            # Hide empty groups
            if (item.item_type in "group") and not data["children"]:
                return None

        return data

    title = obj.display_name if obj.title is None else obj.title

    tmp = obj.to_dict()
    display_config = dict(
        extent=tmp["extent"],
        extent_const=tmp["extent_const"],
        rootItem=traverse(obj.root_item),
        itemsStates=items_states,
        mid=Mid(
            adapter=tuple(mid.adapter),
            basemap=tuple(mid.basemap),
            plugin=tuple(mid.plugin),
        ),
        webmapPlugin=plugin,
        bookmarkLayerId=obj.bookmark_resource_id,
        webmapId=obj.id,
        webmapDescription=obj.description,
        webmapTitle=title,
        webmapEditable=obj.editable,
        webmapLegendVisible=obj.legend_symbols,
        drawOrderEnabled=obj.draw_order_enabled,
        measureSrsId=obj.measure_srs_id,
        printMaxSize=request.env.webmap.options["print.max_size"],
    )

    if request.env.webmap.options["annotation"]:
        display_config["annotations"] = dict(
            enabled=obj.annotation_enabled,
            default=obj.annotation_default,
            scope=dict(
                read=obj.has_permission(WebMapScope.annotation_read, request.user),
                write=obj.has_permission(WebMapScope.annotation_write, request.user),
                manage=obj.has_permission(WebMapScope.annotation_manage, request.user),
            ),
        )

    return DisplayConfig(**display_config)


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
        r"/api/resource/{id:uint}/webmap/display_config",
        factory=webmap_factory,
        get=display_config,
    )
