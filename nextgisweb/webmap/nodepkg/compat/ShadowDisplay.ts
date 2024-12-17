/** @entrypoint */
import { action, computed, observable } from "mobx";
import { Feature } from "ol";
import View from "ol/View";
import type { Control } from "ol/control";
import type { Extent } from "ol/extent";
import type { Geometry } from "ol/geom";
import { fromLonLat, transformExtent } from "ol/proj";

import { errorModal } from "@nextgisweb/gui/error";
import { appendTo } from "@nextgisweb/pyramid/company-logo";
import { gettext } from "@nextgisweb/pyramid/i18n";
import settings from "@nextgisweb/pyramid/settings!webmap";
import topic from "@nextgisweb/webmap/compat/topic";
import { buildControls } from "@nextgisweb/webmap/map-controls";
import MapToolbar from "@nextgisweb/webmap/map-toolbar";
import PanelsManager from "@nextgisweb/webmap/panels-manager";
import { WebMapTabsStore } from "@nextgisweb/webmap/webmap-tabs";

import { FeatureHighlighter } from "../feature-highlighter/FeatureHighlighter";
import { LinkToMainMap } from "../map-controls/control/LinkToMainMap";
import { Identify } from "../map-controls/tool/Identify";
import MapStatesObserver from "../map-state-observer";
import type { MapStatesObserver as IMapStatesObserver } from "../map-state-observer/MapStatesObserver";
import { Map } from "../ol/Map";
import type { BaseLayer } from "../ol/layer/_Base";
import type { PanelPlugin } from "../panels-manager/registry";
import type { PluginBase } from "../plugin/PluginBase";
import WebmapStore from "../store";
import type {
    DisplayConfig,
    MapPlugin,
    MapURLParams,
    TinyConfig,
    WebmapAdapter,
} from "../type";
import type { LayerItemConfig, TreeItemConfig } from "../type/TreeItems";
import type { WebMapSettings } from "../type/WebmapSettings";
import { getURLParams, setURLParam } from "../utils/URL";

import { CustomItemFileWriteStore } from "./CustomItemFileWriteStore";
import type { StoreItem } from "./CustomItemFileWriteStore";
import { LoggedDeferred } from "./LoggedDeferred";
import type { StoreGroupConfig, StoreItemConfig } from "./type";
import { entrypointsLoader } from "./util/entrypointLoader";
import { handlePostMessage } from "./util/handlePostMessage";

export default class ShadowDisplay {
    private readonly modeURLParam: keyof MapURLParams = "panel";
    private readonly emptyModeURLValue = "none";

    mapNode!: HTMLElement;

    config!: DisplayConfig;
    tinyConfig!: TinyConfig;
    clientSettings: WebMapSettings = settings;
    identify!: Identify;
    featureHighlighter!: FeatureHighlighter;

    _mapDeferred!: LoggedDeferred;

    _mapExtentDeferred!: LoggedDeferred;
    _urlParams!: Record<keyof MapURLParams, string>;

    _mid!: Record<string, any>;
    _midDeferred!: Record<string, LoggedDeferred>;
    _layersDeferred!: LoggedDeferred;
    _postCreateDeferred!: LoggedDeferred;
    _startupDeferred!: LoggedDeferred;
    _itemStoreDeferred!: LoggedDeferred;
    _extent_const!: Extent;
    _extent!: Extent;
    _layer_order!: number[];
    tiny!: boolean;

    _itemConfigById!: Record<string, TreeItemConfig>;

    tabsManager: WebMapTabsStore;
    panelsManager!: PanelsManager;

    itemStore!: CustomItemFileWriteStore;
    webmapStore!: WebmapStore;
    mapStates!: IMapStatesObserver;

    displayProjection!: string;
    lonlatProjection!: string;

    mapToolbar!: MapToolbar;
    _plugins!: Record<string, PluginBase>;

    leftTopControlPane!: HTMLDivElement;
    leftBottomControlPane!: HTMLDivElement;
    rightTopControlPane!: HTMLDivElement;
    rightBottomControlPane!: HTMLDivElement;

    /**
     * @deprecated use webmapStore.getlayers() instead
     */
    _layers!: Record<number, BaseLayer>;

    _adapters!: Record<string, WebmapAdapter>;

    @observable.shallow accessor _baseLayer!: BaseLayer;
    readonly map: Map;

    // The Item is now editable. Or not. Who knows?
    @observable.shallow accessor item: StoreItem | null = null;
    @observable.shallow accessor itemConfig: LayerItemConfig | null = null;

    constructor({ config }: { config: DisplayConfig }) {
        this.config = config;

        this._urlParams = getURLParams<MapURLParams>();

        this._itemStoreDeferred = new LoggedDeferred("_itemStoreDeferred");
        this._mapDeferred = new LoggedDeferred("_mapDeferred");
        this._mapExtentDeferred = new LoggedDeferred("_mapExtentDeferred");
        this._layersDeferred = new LoggedDeferred("_layersDeferred");
        this._postCreateDeferred = new LoggedDeferred("_postCreateDeferred");
        this._startupDeferred = new LoggedDeferred("_startupDeferred");
        this.tabsManager = new WebMapTabsStore();
        this.mapStates = MapStatesObserver.getInstance();

        this.map = new Map({
            logo: false,
            controls: [],
            view: new View({
                minZoom: 3,
                constrainResolution: true,
                // TODO: Investigate the source of null values. Normal extent from API types without nulls.
                extent: !(
                    this.config.extent_const as (null | number)[]
                ).includes(null)
                    ? this._extent_const
                    : undefined,
            }),
        });

        // Module loading
        this._midDeferred = {};
        this._mid = {};

        this._buildPanelsManager();

        this._initializeMids();

        // Map plugins
        const wmpmids = Object.keys(this.config.webmapPlugin);
        const deferred = new LoggedDeferred("_midDeferred.webmapPlugin");

        this._midDeferred.webmapPlugin = deferred;

        entrypointsLoader(wmpmids).then((obj) => {
            this._mid.wmplugin = obj;

            deferred.resolve(obj);
        });

        this._itemStoreSetup();
        this._webmapStoreSetup();

        this._mapDeferred.then(() => {
            this._itemStorePrepare();
        });

        this.displayProjection = "EPSG:3857";
        this.lonlatProjection = "EPSG:4326";

        if (this.config.extent[3] > 82) {
            this.config.extent[3] = 82;
        }
        if (this.config.extent[1] < -82) {
            this.config.extent[1] = -82;
        }

        this._extent = transformExtent(
            this.config.extent,
            this.lonlatProjection,
            this.displayProjection
        );

        this._extent_const = transformExtent(
            this.config.extent_const,
            this.lonlatProjection,
            this.displayProjection
        );

        // // Layers panel
        this._layersPanelSetup();

        // // Map and plugins
        Promise.all([
            this._midDeferred.basemap,
            this._midDeferred.webmapPlugin,
            this._startupDeferred,
        ])
            .then(() => {
                this._pluginsSetup(true);
                this._mapSetup();
            })
            .catch((err) => {
                console.error(err);
            });

        // // Setup layers
        Promise.all([this._midDeferred.adapter, this._itemStoreDeferred])
            .then(() => {
                this._layersSetup();
            })
            .catch((err) => {
                console.error(err);
            });

        Promise.all([this._layersDeferred, this._mapSetup])
            .then(() => {
                this._mapAddLayers();
                this.featureHighlighter = this._initializeFeatureHighlighter();
            })
            .catch((err) => {
                console.error(err);
            });

        // Tools and plugins
        Promise.all([this._midDeferred.plugin, this._layersDeferred])
            .then(() => {
                this._pluginsSetup();
                this._buildLayersTree();
            })
            .then(undefined, function (err) {
                console.error(err);
            });

        // display.tools = [];
    }
    startup({
        target,
        leftTopControlPane,
        leftBottomControlPane,
        rightTopControlPane,
        rightBottomControlPane,
    }: {
        target: HTMLElement;
        leftTopControlPane: HTMLDivElement;
        leftBottomControlPane: HTMLDivElement;
        rightTopControlPane: HTMLDivElement;
        rightBottomControlPane: HTMLDivElement;
    }) {
        this.mapNode = target;
        this.leftTopControlPane = leftTopControlPane;
        this.leftBottomControlPane = leftBottomControlPane;
        this.rightTopControlPane = rightTopControlPane;
        this.rightBottomControlPane = rightBottomControlPane;
        this._hideNavMenuForGuest();
        this._startupDeferred.resolve(true);
        this._postCreate();
    }
    _postCreate() {
        // this._handleTinyDisplayMode();

        this._postCreateDeferred.resolve(true);
    }

    // MAP & CONTROLS

    @computed
    get activeBasemapKey(): "blank" | string {
        if (!this._baseLayer || !this._baseLayer.name) {
            return "blank";
        }
        return this._baseLayer.name;
    }

    @action
    setBaseLayer(layer: BaseLayer) {
        this._baseLayer = layer;
    }

    @action
    _mapSetup() {
        this.mapToolbar = new MapToolbar({
            display: this,
            target: this.leftBottomControlPane,
        });

        this.map.startup(this.mapNode);

        const controlsReady = buildControls(this);

        if (controlsReady.has("id")) {
            const controlObj = controlsReady.get("id");
            if (
                controlObj &&
                controlObj.control &&
                controlObj.control instanceof Identify
            ) {
                this.identify = controlObj.control;
                this.mapStates.addState("identifying", this.identify);
                this.mapStates.setDefaultState("identifying", true);
                this._identifyFeatureByAttrValue();
            }
        }

        topic.publish("/webmap/tools/initialized", true);

        // Resize OpenLayers Map on container resize
        const resizeObserver = new ResizeObserver(() => {
            this.map.olMap.updateSize();
        });
        resizeObserver.observe(this.mapNode);

        // resizeObserver.disconnect();

        // Basemaps initialization
        const settings = this.clientSettings;
        let idx = 0;

        for (const bm of settings.basemaps) {
            const MID = this._mid.basemap[bm.base.mid];

            const baseOptions = { ...bm.base };
            const layerOptions = { ...bm.layer };
            const sourceOptions = { ...bm.source };

            if (baseOptions.keyname === undefined) {
                baseOptions.keyname = `basemap_${idx}`;
            }

            try {
                const layer = new MID(
                    baseOptions.keyname,
                    layerOptions,
                    sourceOptions
                );

                if (layer.olLayer.getVisible()) {
                    this.setBaseLayer(layer);
                }
                layer.isBaseLayer = true;
                this.map.addLayer(layer);
            } catch (err) {
                console.warn(
                    `Can't initialize layer [${baseOptions.keyname}]: ${err}`
                );
            }

            idx++;
        }

        appendTo(this.mapNode);
        this._mapDeferred.resolve(true);
    }
    _mapAddControls(controls: Control[]) {
        controls.forEach((control) => {
            this.map?.olMap.addControl(control);
        });
    }
    _mapAddLayer(id: number) {
        const layer = this.webmapStore.getLayer(id);
        this.map?.addLayer(layer);
    }
    private _mapAddLayers() {
        this._layer_order.forEach((id) => {
            this._mapAddLayer(id);
        });
    }
    private _setMapExtent() {
        if (this._zoomByUrlParams()) return;
        this._zoomToInitialExtent();
    }
    _zoomToInitialExtent() {
        this.map.olMap.getView().fit(this._extent);
    }
    _zoomByUrlParams(): boolean {
        const urlParams = this._urlParams;

        if (
            !("zoom" in urlParams && "lon" in urlParams && "lat" in urlParams)
        ) {
            return false;
        }

        const view = this.map.olMap.getView();
        if (urlParams.lon && urlParams.lat) {
            view.setCenter(
                fromLonLat([
                    parseFloat(urlParams.lon),
                    parseFloat(urlParams.lat),
                ])
            );
        }
        if (urlParams.zoom !== undefined) {
            view.setZoom(parseInt(urlParams.zoom));
        }

        if ("angle" in urlParams && urlParams.angle !== undefined) {
            view.setRotation(parseFloat(urlParams.angle));
        }

        return true;
    }

    // STORE & ITEM

    prepareItem(item: TreeItemConfig) {
        const copy = {
            id: item.id,
            type: item.type,
            label: item.label,
        } as StoreItemConfig;

        if (item.type === "layer" && copy.type === "layer") {
            copy.layerId = item.layerId;
            copy.styleId = item.styleId;

            copy.visibility = null;
            copy.checked = item.visibility;
            copy.identifiable = item.identifiable;
            copy.position = item.drawOrderPosition;
        } else if (item.type === "root" && copy.type === "root") {
            copy.children = item.children.map((c) => {
                return this.prepareItem(c) as StoreGroupConfig;
            });
        } else if (item.type === "group" && copy.type === "group") {
            copy.children = item.children.map((c) => {
                return this.prepareItem(c) as StoreGroupConfig;
            });
        }

        this._itemConfigById[item.id] = item;
        return copy;
    }
    getItemConfig() {
        return Object.assign({}, this._itemConfigById);
    }
    dumpItem() {
        return this.itemStore.dumpItem(this.item);
    }
    private _itemStoreSetup() {
        this._itemConfigById = {};
        const rootItem = this.prepareItem(this.config.rootItem);
        this.itemStore = new CustomItemFileWriteStore({
            data: {
                identifier: "id",
                label: "label",
                items: [rootItem],
            },
        });
    }
    private _webmapStoreSetup() {
        this.webmapStore = new WebmapStore({
            itemStore: this.itemStore,
        });
    }
    private _itemStorePrepare() {
        this.itemStore.fetch({
            queryOptions: { deep: true },
            onItem: (item) => {
                this._itemStorePrepareItem(item);
            },
            onComplete: () => {
                this._itemStoreDeferred.resolve(true);
            },
            onError: (error: Error) => {
                console.error(error);
                this._itemStoreDeferred.reject(false);
            },
        });
    }
    private _itemStorePrepareItem(item: StoreItem) {
        this._itemStoreVisibility(item);
    }
    private _itemStoreVisibility(item: StoreItem) {
        const webmapStore = this.webmapStore;

        if (webmapStore) {
            webmapStore._itemStoreVisibility(item);
        }
    }
    async getVisibleItems() {
        return new Promise<StoreItem[]>((resolve, reject) => {
            const store = this.itemStore;

            store.fetch({
                query: { type: "layer", visibility: true },
                sort: { attribute: "position" },
                queryOptions: { deep: true },
                onComplete: (items) => {
                    resolve(items);
                },
                onError: (error) => {
                    reject(error);
                },
            });
        });
    }

    // LAYERS

    switchBasemap(basemapLayerKey: string) {
        if (!(basemapLayerKey in this.map.layers)) {
            return false;
        }

        if (this._baseLayer && this._baseLayer.name) {
            const { name } = this._baseLayer;
            this.map.layers[name].olLayer.setVisible(false);
        }

        const newLayer = this.map.layers[basemapLayerKey];
        newLayer.olLayer.setVisible(true);
        this._baseLayer = newLayer;

        return true;
    }
    setLayerZIndex(id: number, zIndex: number) {
        const layer = this.map.layers[id];
        if (layer && layer.olLayer && layer.olLayer.setZIndex) {
            layer.olLayer.setZIndex(zIndex);
        }
    }

    private _layersSetup() {
        const store = this.itemStore;
        let visibleStyles: number[] | null = null;

        this._adaptersSetup();

        // Layer index by id for backward compatibility
        Object.defineProperty(this, "_layers", {
            get: function () {
                console.log(
                    `display._layers wes deprecated use this.webmapStore._layers instead.`
                );
                return this.webmapStore._layers;
            },
        });
        this._layer_order = []; // Layers from back to front

        if (typeof this._urlParams.styles === "string") {
            visibleStyles = this._urlParams.styles
                .split(",")
                .map((i) => parseInt(i, 10));
        }

        // Layers initialization
        store.fetch({
            query: { type: "layer" },
            queryOptions: { deep: true },
            sort: this.config.drawOrderEnabled
                ? [
                      {
                          attribute: "position",
                      },
                  ]
                : null,
            onItem: (item) => {
                this._onNewStoreItem(item);

                // Turn on layers from permalink
                let cond;
                const layer = this.webmapStore.getLayer(
                    store.getValue(item, "id")
                );
                if (visibleStyles) {
                    cond =
                        visibleStyles.indexOf(
                            store.getValue(item, "styleId")
                        ) !== -1;

                    layer.olLayer.setVisible(cond);
                    layer.setVisibility(cond);
                    store.setValue(item, "checked", cond);
                }
            },
            onComplete: () => {
                this._layersDeferred.resolve(true);
            },
            onError: (error: Error) => {
                console.error(error);
                this._layersDeferred.reject(false);
            },
        });
    }
    private _layerSetup(item: StoreItem) {
        const store = this.itemStore;

        const data = this._itemConfigById[store.getValue(item, "id")];
        if (data.type === "layer") {
            const adapter = this._adapters[data.adapter];
            const metersPerUnit = this.map.olMap
                .getView()
                .getProjection()
                .getMetersPerUnit();
            if (metersPerUnit !== undefined) {
                if (data.maxScaleDenom !== null) {
                    const minResolution = this.map.getResolutionForScale(
                        data.maxScaleDenom,
                        metersPerUnit
                    );
                    if (minResolution !== undefined) {
                        data.minResolution = minResolution;
                    }
                }
                if (data.minScaleDenom !== null) {
                    const maxResolution = this.map.getResolutionForScale(
                        data.minScaleDenom,
                        metersPerUnit
                    );
                    if (maxResolution !== undefined) {
                        data.maxResolution = maxResolution;
                    }
                }
            }

            const layer = adapter.createLayer(data);

            layer.itemId = data.id;
            layer.itemConfig = data;

            this.webmapStore.addLayer(data.id, layer);
        }
    }
    private _onNewStoreItem(item: StoreItem) {
        const store = this.itemStore;
        this._layerSetup(item);
        this._layer_order.unshift(store.getValue(item, "id"));
    }
    private _adaptersSetup() {
        this._adapters = {};

        Object.keys(this._mid.adapter).forEach((k) => {
            this._adapters[k] = new this._mid.adapter[k]({
                display: this,
            });
        });
    }
    private _buildLayersTree() {
        const { expanded } = this.config.itemsStates;
        this.webmapStore.setWebmapItems(this.config.rootItem.children);
        this.webmapStore.setExpanded(expanded);
    }
    @action
    _switchBasemap(basemapLayerKey: string) {
        if (!this.map) {
            return;
        }
        if (!(basemapLayerKey in this.map.layers)) {
            return false;
        }

        if (this._baseLayer && this._baseLayer.name) {
            const { name } = this._baseLayer;
            this.map.layers[name].olLayer.setVisible(false);
        }

        const newLayer = this.map.layers[basemapLayerKey];
        newLayer.olLayer.setVisible(true);
        this._baseLayer = newLayer;

        return true;
    }
    private _layersPanelSetup() {
        Promise.all([
            this._layersDeferred,
            this._mapDeferred,
            this._postCreateDeferred,
            this.panelsManager.panelsReady.promise,
        ])
            .then(() => {
                if (this._urlParams.base) {
                    this.switchBasemap(this._urlParams.base);
                }
                this._setMapExtent();
                this._mapExtentDeferred.resolve(true);
            })
            .catch((err) => {
                console.error(err);
            });
    }

    // PLUGINS

    private _pluginsSetup(wmplugin?: boolean) {
        if (!this._plugins) {
            this._plugins = {};
        }

        const plugins = wmplugin ? this._mid.wmplugin : this._mid.plugin;
        this._installPlugins(plugins);
    }
    private _installPlugins(
        plugins: Record<string, MapPlugin | { default: MapPlugin }>
    ) {
        Object.keys(plugins).forEach((key) => {
            console.log("Plugin [%s]::constructor...", key);

            if (this.isTinyMode() && !this.isTinyModePlugin(key)) {
                return;
            }

            if (this.isTinyMode() && !this.isTinyModePlugin(key)) {
                return;
            }

            let pluginInfo = plugins[key];
            if (!pluginInfo) {
                return;
            }

            if ("default" in pluginInfo) {
                pluginInfo = pluginInfo.default;
            }

            const plugin = new pluginInfo({
                identity: key,
                display: this,
                itemStore: plugins ? false : this.itemStore,
            });

            this._postCreateDeferred.then(() => {
                console.log("Plugin [%s]::postCreate...", key);
                plugin.postCreate();

                this._startupDeferred.then(() => {
                    console.log("Plugin [%s]::startup...", key);
                    plugin.startup();

                    this._plugins[key] = plugin;
                    console.info("Plugin [%s] registered", key);
                });
            });
        });
    }
    private _initializeMids() {
        const mids = this.config.mid;

        const basemapMids: [
            name: string,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            mid: () => Promise<{ default: typeof BaseLayer<any, any, any> }>,
        ][] = [
            [
                "@nextgisweb/webmap/ol/layer/OSM",
                () => import("@nextgisweb/webmap/ol/layer/OSM"),
            ],
            [
                "@nextgisweb/webmap/ol/layer/XYZ",
                () => import("@nextgisweb/webmap/ol/layer/XYZ"),
            ],
            [
                "@nextgisweb/webmap/ol/layer/QuadKey",
                () => import("@nextgisweb/webmap/ol/layer/QuadKey"),
            ],
        ];

        mids.basemap.push(...basemapMids);

        for (const key in mids) {
            const midarr = mids[key as keyof typeof mids];

            const deferred = new LoggedDeferred(`_midDeferred.${key}`);
            this._midDeferred[key] = deferred;

            entrypointsLoader(midarr).then((obj) => {
                this._mid[key] = obj;
                deferred.resolve(obj);
            });
        }
    }
    isTinyModePlugin(pluginKey: string) {
        const disabledPlugins = [
            "@nextgisweb/webmap/plugin/layer-editor",
            "@nextgisweb/webmap/plugin/feature-layer",
        ];
        return !disabledPlugins.includes(pluginKey);
    }

    // FEATURE
    @action
    setItemConfig(itemConfig: LayerItemConfig) {
        this.itemConfig = itemConfig;
    }
    @action
    setItem(item: StoreItem) {
        this.item = item;
    }

    highlightGeometry(geometry: Geometry): void {
        this.map.zoomToFeature(new Feature({ geometry }));
        topic.publish("feature.highlight", {
            olGeometry: geometry,
        });
    }
    handleSelect(selectedKeys: number[]) {
        if (selectedKeys.length === 0 || selectedKeys.length < 1) {
            return;
        }
        const itemId = selectedKeys[0];
        this.itemStore.fetchItemByIdentity({
            identity: itemId,
            onItem: (item) => {
                this.setItemConfig(
                    this._itemConfigById[itemId] as LayerItemConfig
                );

                this.setItem(item as StoreItem);
            },
        });
    }
    _initializeFeatureHighlighter() {
        return new FeatureHighlighter(this.map);
    }
    private _identifyFeatureByAttrValue() {
        const urlParams = this._urlParams;

        if (
            !(
                urlParams.hl_lid !== undefined &&
                urlParams.hl_attr !== undefined &&
                urlParams.hl_val !== undefined
            )
        ) {
            return;
        }

        this.identify
            .identifyFeatureByAttrValue(
                Number(urlParams.hl_lid),
                urlParams.hl_attr,
                urlParams.hl_val,
                urlParams.zoom !== undefined
                    ? Number(urlParams.zoom)
                    : undefined
            )
            .then((result) => {
                if (result) return;
                errorModal({
                    title: gettext("Object not found"),
                    message: gettext("Object from URL parameters not found"),
                });
            });
    }

    //  UI

    isTinyMode() {
        return this.tinyConfig !== undefined;
    }

    getUrlParams() {
        return this._urlParams;
    }

    private _buildPanelsManager() {
        const activePanelKey = this._urlParams[this.modeURLParam];
        const onChangePanel = (panel?: PanelPlugin) => {
            if (panel) {
                setURLParam(this.modeURLParam, panel.name);
            } else {
                setURLParam(this.modeURLParam, this.emptyModeURLValue);
            }
        };

        let allowPanels;
        if (this.isTinyMode()) {
            const panels = this._urlParams.panels;
            allowPanels = panels ? panels.split(",") : [];
        }

        this.panelsManager = new PanelsManager(
            this,
            activePanelKey,
            allowPanels,
            onChangePanel
        );

        this._buildPanels();
    }
    private async _buildPanels() {
        await Promise.all([this._layersDeferred, this._postCreateDeferred]);
    }
    private _buildTinyPanels() {
        if (!this.panelsManager.getPanelsCount()) {
            return;
        }

        this.domNode.classList.add("tiny-panels");
        const activePanel = this.panelsManager.getActivePanelName();
        if (!activePanel) {
            return;
        }
        this.panelsManager.deactivatePanel();
        this.panelsManager.activatePanel(activePanel);
    }
    private _handleTinyDisplayMode() {
        if (!this.isTinyMode()) {
            return;
        }

        this.domNode.classList.add("tiny");

        Promise.all([
            this._layersDeferred,
            this._mapDeferred,
            this._postCreateDeferred,
            this.panelsManager.panelsReady.promise,
        ])
            .then(() => {
                this._buildTinyPanels();
                this._addLinkToMainMap();
                this._handlePostMessage();
            })
            .then(undefined, function (err) {
                console.error(err);
            });
    }
    private _hideNavMenuForGuest() {
        if (!this.clientSettings.hide_nav_menu || !ngwConfig.isGuest) {
            return;
        }

        const navMenu = document.querySelector("#header #menu") as HTMLElement;
        if (!navMenu) return;
        navMenu.style.display = "none";
    }
    private _addLinkToMainMap() {
        if (this._urlParams.linkMainMap !== "true") {
            return;
        }
        this.map.olMap.addControl(
            new LinkToMainMap({
                url: this.tinyConfig.mainDisplayUrl,
                target: this.rightTopControlPane,
                tipLabel: gettext("Open full map"),
            })
        );
    }

    /**
     * Generate window `message` events to listen from iframe
     * @example
     * window.addEventListener('message', function(evt) {
     *    const data = evt.data;
     *    if (data.event === 'ngMapExtentChanged') {
     *        if (data.detail === 'zoom') {
     *        } else if (data.detail === 'move') {
     *        }
     *        // OR
     *        if (data.detail === 'position') {}
     *    }
     * }, false);
     */
    _handlePostMessage() {
        handlePostMessage(this);
    }
}
