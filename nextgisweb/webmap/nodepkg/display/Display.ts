import { action, computed, observable } from "mobx";
import { Feature } from "ol";
import type { Control } from "ol/control";
import type { Extent } from "ol/extent";
import type { Geometry } from "ol/geom";
import { fromLonLat, transformExtent } from "ol/proj";

import { errorModal } from "@nextgisweb/gui/error";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { layoutStore } from "@nextgisweb/pyramid/layout";
import topic from "@nextgisweb/webmap/compat/topic";
import type {
    DisplayConfig,
    GroupItemConfig,
    LayerItemConfig,
    MidConfig,
} from "@nextgisweb/webmap/type/api";
import { WebMapTabsStore } from "@nextgisweb/webmap/webmap-tabs";

import type {
    LayerDisplayAdapter,
    LayerDisplayAdapterCtor,
} from "../DisplayLayerAdapter";
import settings from "../client-settings";
import { CustomItemFileWriteStore } from "../compat/CustomItemFileWriteStore";
import type { StoreItem } from "../compat/CustomItemFileWriteStore";
import { LoggedDeferred } from "../compat/LoggedDeferred";
import type { StoreGroupConfig, StoreItemConfig } from "../compat/type";
import { entrypointsLoader } from "../compat/util/entrypointLoader";
import { FeatureHighlighter } from "../feature-highlighter/FeatureHighlighter";
import { MapStore } from "../ol/MapStore";
import type { PanelStore } from "../panel";
import { PanelManager } from "../panel/PanelManager";
import type { PluginBase } from "../plugin/PluginBase";
import { Identify, WebmapStore } from "../store";
import type {
    DisplayURLParams,
    Entrypoint,
    MapPlugin,
    Mid,
    TinyConfig,
} from "../type";
import type { TreeChildrenItemConfig, TreeItemConfig } from "../type/TreeItems";
import { setURLParam } from "../utils/URL";
import { normalizeExtent } from "../utils/normalizeExtent";

import { displayURLParams } from "./displayURLParams";

export class Display {
    private readonly emptyModeURLValue = "none";
    readonly _itemConfigById: Record<string, TreeItemConfig> = {};
    displayProjection = "EPSG:3857";
    lonlatProjection = "EPSG:4326";

    config: DisplayConfig;
    tinyConfig?: TinyConfig;
    clientSettings = settings;
    tiny?: boolean;

    readonly map: MapStore;
    private _extent: Extent;
    private _extentConst: Extent | null;
    private readonly _layerOrder: number[] = []; // Layers from back to front

    identify: Identify;
    itemStore: CustomItemFileWriteStore;
    webmapStore: WebmapStore;
    tabsManager: WebMapTabsStore;
    panelManager: PanelManager;

    featureHighlighter: FeatureHighlighter;
    readonly plugins: Record<string, PluginBase> = {};
    readonly _adapters: Record<string, LayerDisplayAdapter> = {};
    private _mid: Mid = {
        adapter: {},
        plugin: {},
        wmplugin: {},
    };

    urlParams: DisplayURLParams;

    // Deferred Objects

    @observable.ref accessor mapReady = false;
    /** @deprecated use observable {@link mapReady instead} */
    mapDeferred: LoggedDeferred;

    mapExtentDeferred: LoggedDeferred;
    layersDeferred: LoggedDeferred;
    private _midDeferred: Record<string, LoggedDeferred>;
    private _postCreateDeferred: LoggedDeferred;
    private _startupDeferred: LoggedDeferred;
    private _itemStoreDeferred: LoggedDeferred;

    @observable.ref accessor item: StoreItem | null = null;
    @observable.ref accessor itemConfig:
        | GroupItemConfig
        | LayerItemConfig
        | null = null;

    @observable.ref accessor isMobile = false;

    constructor({
        config,
        tinyConfig,
    }: {
        config: DisplayConfig;
        tinyConfig?: TinyConfig;
    }) {
        this.config = config;
        this.tinyConfig = tinyConfig;
        this.urlParams = displayURLParams.values();

        this._itemStoreDeferred = new LoggedDeferred("_itemStoreDeferred");
        this.mapDeferred = new LoggedDeferred("_mapDeferred");
        this.mapExtentDeferred = new LoggedDeferred("_mapExtentDeferred");
        this.layersDeferred = new LoggedDeferred("_layersDeferred");
        this._postCreateDeferred = new LoggedDeferred("_postCreateDeferred");
        this._startupDeferred = new LoggedDeferred("_startupDeferred");
        this.tabsManager = new WebMapTabsStore();

        this.config.initialExtent = normalizeExtent(this.config.initialExtent);
        this._extent = transformExtent(
            this.config.initialExtent,
            this.lonlatProjection,
            this.displayProjection
        );

        this._extentConst = null;
        if (this.config.constrainingExtent) {
            this.config.constrainingExtent = normalizeExtent(
                this.config.constrainingExtent
            );
            this._extentConst = transformExtent(
                this.config.constrainingExtent,
                this.lonlatProjection,
                this.displayProjection
            );
        }

        this.map = new MapStore({
            logo: false,
            controls: [],
            initialExtent: this._extent,
            extent: this._extentConst || undefined,
            measureSrsId: this.config.measureSrsId,
        });
        this.identify = new Identify({ display: this });

        this.featureHighlighter = new FeatureHighlighter(this.map);

        // Module loading
        this._midDeferred = {};

        this.panelManager = this._buildPanelManager();

        this._initializeMids();

        // Map plugins
        const wmpmids = Object.keys(this.config.webmapPlugin);
        const deferred = new LoggedDeferred("_midDeferred.webmapPlugin");

        this._midDeferred.webmapPlugin = deferred;

        entrypointsLoader(wmpmids).then((obj) => {
            this._mid.wmplugin = obj;

            deferred.resolve(obj);
        });

        const rootItem = this.prepareItem(this.config.rootItem);
        this.itemStore = new CustomItemFileWriteStore({
            data: {
                identifier: "id",
                label: "label",
                items: [rootItem],
            },
        });

        this.webmapStore = new WebmapStore({
            itemStore: this.itemStore,
        });

        this.mapDeferred.then(() => {
            this._itemStorePrepare();
        });

        // Layers panel
        this._layersPanelSetup();

        // Map and plugins
        Promise.all([
            this._midDeferred.webmapPlugin,
            this._startupDeferred,
        ]).then(() => {
            this._pluginsSetup(true);
            this._mapSetup();
        });

        // Setup layers
        Promise.all([this._midDeferred.adapter, this._itemStoreDeferred]).then(
            () => {
                this._layersSetup();
            }
        );

        Promise.all([this.layersDeferred, this._mapSetup]).then(() => {
            this._mapAddLayers();
        });

        // Tools and plugins
        Promise.all([this._midDeferred.plugin, this.layersDeferred]).then(
            () => {
                this._pluginsSetup();
                this._buildLayersTree();
            }
        );
    }
    startup() {
        this._hideNavMenuForGuest();
        this._startupDeferred.resolve(true);
        this._postCreate();
    }
    _postCreate() {
        this._postCreateDeferred.resolve(true);
    }

    @action.bound
    setIsMobile(val: boolean) {
        this.isMobile = val;
    }

    // MAP & CONTROLS

    @action
    _mapSetup() {
        this._identifyFeatureByAttrValue();

        topic.publish("/webmap/tools/initialized", true);

        this.mapDeferred.resolve(true);
    }

    @action.bound
    setMapReady(status: boolean) {
        this.mapReady = status;
    }

    _mapAddControls(_controls: Control[]) {
        // controls.forEach((control) => {
        //     this.map?.olMap.addControl(control);
        // });
    }
    _mapAddLayer(id: number) {
        const layer = this.webmapStore.getLayer(id);
        this.map?.addLayer(layer);
    }
    private _mapAddLayers() {
        this._layerOrder.forEach((id) => {
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
        const urlParams = this.urlParams;

        if (
            !("zoom" in urlParams && "lon" in urlParams && "lat" in urlParams)
        ) {
            return false;
        }

        const view = this.map.olMap.getView();
        if (urlParams.lon && urlParams.lat) {
            view.setCenter(fromLonLat([urlParams.lon, urlParams.lat]));
        }
        if (urlParams.zoom !== undefined) {
            view.setZoom(urlParams.zoom);
        }

        if ("angle" in urlParams && urlParams.angle !== undefined) {
            view.setRotation(urlParams.angle);
        }

        return true;
    }

    // STORE & ITEM

    prepareItem<T extends TreeItemConfig>(item: T): StoreItemConfig {
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

    setupAdapter(key: string, Module: LayerDisplayAdapterCtor) {
        if (!this._adapters[key]) {
            this._adapters[key] = new Module({
                display: this,
            });
        }
    }

    private _layersSetup() {
        const store = this.itemStore;

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
                const layerId = store.getValue(item, "id");
                const layer = this.webmapStore.getLayer(layerId);
                if (this.urlParams.styles) {
                    const styleId = store.getValue(item, "styleId");
                    cond = styleId in this.urlParams.styles;
                    if (cond) {
                        const symbols = this.urlParams.styles[styleId];
                        if (symbols) {
                            this.webmapStore.setItemSymbols(
                                layerId,
                                symbols === "-1" ? [] : symbols
                            );
                        }
                    }
                    layer.olLayer.setVisible(cond);
                    layer.setVisibility(cond);
                    store.setValue(item, "checked", cond);
                }
            },
            onComplete: () => {
                this.layersDeferred.resolve(true);
            },
            onError: (error: Error) => {
                console.error(error);
                this.layersDeferred.reject(false);
            },
        });
    }
    private _layerSetup(item: StoreItem) {
        const store = this.itemStore;

        const data = this._itemConfigById[store.getValue(item, "id")];
        if (data.type === "layer") {
            const adapter = this._adapters[data.adapter];

            if (data.maxScaleDenom !== null) {
                const minResolution = this.map.resolutionForScale(
                    data.maxScaleDenom
                );
                if (minResolution !== undefined) {
                    data.minResolution = minResolution;
                }
            }
            if (data.minScaleDenom !== null) {
                const maxResolution = this.map.resolutionForScale(
                    data.minScaleDenom
                );
                if (maxResolution !== undefined) {
                    data.maxResolution = maxResolution;
                }
            }

            const layer = adapter.createLayer(data);

            // layer.itemId = data.id;
            layer.setItemConfig(data);

            this.webmapStore.addLayer(data.id, layer);
        }
    }

    _onNewStoreItem(item: StoreItem) {
        const store = this.itemStore;
        this._layerSetup(item);
        this._layerOrder.unshift(store.getValue(item, "id"));
    }
    private _adaptersSetup() {
        Object.keys(this._mid.adapter).forEach((k) => {
            this.setupAdapter(k, this._mid.adapter[k]);
        });
    }
    private _buildLayersTree() {
        this.webmapStore.setWebmapItems(this.config.rootItem.children);
        this.webmapStore.setExpanded(this.config.expandedItems);
    }

    private _layersPanelSetup() {
        Promise.all([
            this.layersDeferred,
            this.mapDeferred,
            this._postCreateDeferred,
            this.panelManager.panelsReady.promise,
        ])
            .then(() => {
                this._setMapExtent();
                this.mapExtentDeferred.resolve(true);
            })
            .catch((err) => {
                console.error(err);
            });
    }

    // PLUGINS

    private _pluginsSetup(wmplugin?: boolean) {
        const plugins = wmplugin ? this._mid.wmplugin : this._mid.plugin;

        this._installPlugins(plugins);
    }
    _installPlugins(
        plugins: Record<string, MapPlugin | { default: MapPlugin }>
    ) {
        Object.keys(plugins).forEach((key) => {
            if (this.isTinyMode && !this.isTinyModePlugin(key)) {
                return;
            }

            if (this.isTinyMode && !this.isTinyModePlugin(key)) {
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
                plugin.postCreate();

                this._startupDeferred.then(() => {
                    plugin.startup();
                    this.plugins[key] = plugin;
                });
            });
        });
    }
    private _initializeMids() {
        const mids = { ...this.config.mid } as Record<
            keyof MidConfig,
            (string | Entrypoint)[]
        >;

        for (const key in mids) {
            const k = key as keyof typeof mids;
            const midarr = mids[k];

            const deferred = new LoggedDeferred(`_midDeferred.${k}`);
            this._midDeferred[k] = deferred;

            entrypointsLoader(midarr).then((obj) => {
                this._mid[k] = obj;

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
    setItemConfig(itemConfig: TreeChildrenItemConfig | null) {
        this.itemConfig = itemConfig;
    }
    @action
    setItem(item: StoreItem | null) {
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
            this.setItemConfig(null);
            this.setItem(null);
            return;
        }
        const itemId = selectedKeys[0];
        this.itemStore.fetchItemByIdentity({
            identity: itemId,
            onItem: (item) => {
                if (item) {
                    const itemConfig = this._itemConfigById[itemId];
                    this.setItemConfig(
                        itemConfig.type !== "root" ? itemConfig : null
                    );
                } else {
                    this.setItemConfig(null);
                }
                this.setItem(item);
            },
        });
    }

    private _identifyFeatureByAttrValue() {
        const urlParams = this.urlParams;

        if (
            !this.identify ||
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
    @computed
    get isTinyMode() {
        return this.tinyConfig !== undefined;
    }

    getUrlParams() {
        return this.urlParams;
    }

    private _buildPanelManager() {
        const activePanelKey = this.urlParams.panel;
        const onChangePanel = (panel?: PanelStore) => {
            if (panel) {
                setURLParam("panel", panel.name);
            } else {
                setURLParam("panel", this.emptyModeURLValue);
            }
        };

        let allowPanels;
        if (this.isTinyMode) {
            allowPanels = this.urlParams.panels || [];
        }

        const panelManager = new PanelManager(
            this,
            activePanelKey,
            allowPanels,
            onChangePanel
        );

        return panelManager;
    }

    private _hideNavMenuForGuest() {
        const shouldHideMenu =
            this.clientSettings.hide_nav_menu && ngwConfig.isGuest;
        layoutStore.setHideMenu(shouldHideMenu);
    }
}
