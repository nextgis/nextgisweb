import { action, computed, observable } from "mobx";
import type { Extent } from "ol/extent";
import { transformExtent } from "ol/proj";

import { errorModal } from "@nextgisweb/gui/error";
import pyramidSettings from "@nextgisweb/pyramid/client-settings";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { layoutStore } from "@nextgisweb/pyramid/layout";
import type { DisplayConfig } from "@nextgisweb/webmap/type/api";
import { WebMapTabsStore } from "@nextgisweb/webmap/webmap-tabs";

import settings from "../client-settings";
import { HighlightStore } from "../highlight-store";
import { MapStore } from "../ol/MapStore";
import { PanelManager } from "../panel/PanelManager";
import type { PluginBase } from "../plugin/PluginBase";
import { Identify, TreeStore } from "../store";
import type { TreeItemStore } from "../store/tree-store/TreeItemStore";
import type { DisplayURLParams, MapPlugin, TinyConfig } from "../type";
import { normalizeExtent } from "../utils/normalizeExtent";

import { displayURLParams } from "./displayURLParams";

export class Display {
    displayProjection = "EPSG:3857";
    lonlatProjection = "EPSG:4326";

    config: DisplayConfig;
    tinyConfig?: TinyConfig;
    clientSettings = settings;

    readonly map: MapStore;

    identify: Identify;
    treeStore: TreeStore;
    tabsManager: WebMapTabsStore;
    highlighter = new HighlightStore();
    panelManager: PanelManager;

    readonly plugins: Record<string, PluginBase> = {};

    urlParams: DisplayURLParams;

    @observable.ref accessor mapReady = false;
    @observable.ref accessor item: TreeItemStore | null = null;
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

        this.tabsManager = new WebMapTabsStore();

        this.config.initialExtent = normalizeExtent(this.config.initialExtent);
        const initialExtent = transformExtent(
            this.config.initialExtent,
            this.lonlatProjection,
            this.displayProjection
        );

        let constrainingExtent: Extent | undefined = undefined;
        if (this.config.constrainingExtent) {
            this.config.constrainingExtent = normalizeExtent(
                this.config.constrainingExtent
            );
            constrainingExtent = transformExtent(
                this.config.constrainingExtent,
                this.lonlatProjection,
                this.displayProjection
            );
        }

        this.map = new MapStore({
            logo: false,
            controls: [],
            initialExtent,
            constrainingExtent,
            measureSrsId: this.config.measureSrsId,
            displayProjection: this.displayProjection,
            lonlatProjection: this.lonlatProjection,
            hmux:
                pyramidSettings.lunkwill_hmux &&
                this.config.options["webmap.hmux"],
        });
        this.identify = new Identify({ display: this });

        this.panelManager = new PanelManager({
            display: this,
        });

        this.treeStore = new TreeStore(this.config.rootItem, {
            drawOrderEnabled: this.config.drawOrderEnabled,
        });

        this._pluginsSetup();
        this._identifyFeatureByAttrValue();

        this._setUpLayersTree();
    }
    startup() {
        this._hideNavMenuForGuest();
    }

    @action.bound
    setIsMobile(val: boolean) {
        this.isMobile = val;
    }

    @action.bound
    setMapReady(status: boolean) {
        this.mapReady = status;
    }

    getVisibleItems() {
        const store = this.treeStore;
        return store.filter({ type: "layer", visibility: true });
    }

    @action.bound
    private _setUpLayersTree() {
        const store = this.treeStore;
        const urlStyles = this.urlParams.styles;
        if (urlStyles) {
            const checked: number[] = [];
            store.items.values().forEach((item) => {
                let cond;
                if (item.isLayer()) {
                    const styleId = item.styleId;
                    cond = styleId in urlStyles;
                    if (cond) {
                        const symbols = urlStyles[styleId];
                        if (symbols) {
                            item.update({
                                symbols: symbols === "-1" ? [] : symbols,
                            });
                        }
                        checked.push(item.id);
                    }
                }
            });
            store.setVisibleIds(checked);
        }
    }

    // PLUGINS

    private _pluginsSetup() {
        const plugins = this.config.webmapPlugin;
        if (plugins) {
            this.installPlugins(Object.keys(plugins));
        }
    }

    async installPlugins(pluginKeys: string[]) {
        const pluginsToLoad: Promise<MapPlugin | { default: MapPlugin }>[] = [];
        for (const key of pluginKeys) {
            if (this.isTinyMode && !this.isTinyModePlugin(key)) {
                continue;
            }

            const pluginLoader = ngwEntry(key) as Promise<
                MapPlugin | { default: MapPlugin }
            >;
            pluginLoader.then((pluginInfo) => {
                if (!pluginInfo) {
                    return;
                }

                if ("default" in pluginInfo) {
                    pluginInfo = pluginInfo.default;
                }

                const plugin = new pluginInfo({
                    identity: key,
                    display: this,
                    treeStore: this.treeStore,
                });

                this.plugins[key] = plugin;
            });
            pluginsToLoad.push(pluginLoader);
        }

        await Promise.allSettled(pluginsToLoad);

        return this.plugins;
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
    setItem(item: TreeItemStore | null) {
        this.item = item;
    }

    handleSelect(selectedKeys: number[]) {
        if (selectedKeys.length < 1) {
            this.setItem(null);
            return;
        }
        const itemId = selectedKeys[0];
        const item = this.treeStore.getItemById(itemId);

        this.setItem(item);
    }

    private _identifyFeatureByAttrValue() {
        const urlParams = this.urlParams;

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

    @computed
    get isTinyMode() {
        return this.tinyConfig !== undefined;
    }

    private _hideNavMenuForGuest() {
        const shouldHideMenu =
            this.clientSettings.hide_nav_menu && ngwConfig.isGuest;
        layoutStore.setHideMenu(shouldHideMenu);
    }
}
