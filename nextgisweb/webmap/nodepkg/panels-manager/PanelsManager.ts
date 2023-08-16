import orderBy from "lodash/orderBy";
import reactApp from "@nextgisweb/gui/react-app";
import NavigationMenu from "@nextgisweb/webmap/navigation-menu";

function Deferred() {
    this.promise = new Promise((resolve, reject) => {
        this.reject = reject;
        this.resolve = resolve;
    });
}

const isFuncReactComponent = (cls) => {
    return (
        typeof cls === "function" &&
        String(cls).includes("return React.createElement")
    );
};

export class PanelsManager {
    private _domElements;
    private _activePanelKey;
    private _panels = new Map();
    private _initialized = false;
    private _initPromises = [];

    private _onChangePanel;
    private _panelsReady = new Deferred();

    constructor(activePanelKey, onChangePanel) {
        this._activePanelKey = activePanelKey;
        this._onChangePanel = onChangePanel;
    }

    private _clickNavigationMenu(newPanel) {
        const { name } = newPanel;

        if (this._activePanelKey === name) {
            this._deactivatePanel(newPanel);
            this._activePanelKey = undefined;
        } else {
            if (this._activePanelKey) {
                this._deactivatePanel(this._panels.get(this._activePanelKey));
            }
            this._activatePanel(newPanel);
            this._activePanelKey = name;
        }

        this._buildNavigationMenu();
    }

    private _buildNavigationMenu() {
        reactApp(
            NavigationMenu,
            {
                panels: this._panels,
                active: this._activePanelKey,
                onClick: (p) => this._clickNavigationMenu(p),
            },
            this._domElements.navigation
        );
    }

    private _activatePanel(panel) {
        if (panel.isFullWidth) {
            this._domElements.leftPanel.domNode.classList.add(
                "leftPanelPane--fullwidth"
            );
            this._domElements.leftPanel.set("splitter", false);
        }

        this._domElements.leftPanel.addChild(panel);
        this._domElements.main.addChild(this._domElements.leftPanel);

        panel.show();
        this._onChangePanel(panel);
    }

    private _deactivatePanel(panel) {
        this._domElements.main.removeChild(this._domElements.leftPanel);
        this._domElements.leftPanel.removeChild(panel);

        if (panel.isFullWidth) {
            this._domElements.leftPanel.domNode.classList.remove(
                "leftPanelPane--fullwidth"
            );
            this._domElements.leftPanel.set("splitter", true);
        }

        panel.hide();
        this._onChangePanel(undefined);
    }

    private _closePanel(panel) {
        this._deactivatePanel(panel);
        this._activePanelKey = undefined;
    }

    private _handleInitActive() {
        if (this._initialized) {
            return;
        }

        if (this._activePanelKey === "none") {
            this._activePanelKey = undefined;
            this._initialized = true;
            this._panelsReady.resolve();
        }

        if (this._panels.has(this._activePanelKey)) {
            this._activatePanel(this._panels.get(this._activePanelKey));
            this._initialized = true;
            this._panelsReady.resolve();
        }
    }

    private _activateFirstPanel() {
        const [name, firstPanel] = this._panels.entries().next().value;
        this._activePanelKey = name;
        this._activatePanel(firstPanel);
    }

    private _makePanel(panel) {
        if (!panel) {
            return;
        }

        let newPanel: object;
        let name: string;
        if (panel.cls) {
            const { cls, params } = panel;
            name = params.name;

            if (isFuncReactComponent(cls)) {
                throw new Error("Panel React rendering is not implemented");
            } else {
                const widget = new cls(params);
                widget.on("closed", (panel) => {
                    this._closePanel(panel);
                });
                newPanel = widget;
            }
        } else {
            name = panel.name;
            panel.on("closed", (panel) => {
                this._closePanel(panel);
            });
            newPanel = panel;
        }

        if (this._panels.has(name)) {
            console.error(`Panel ${name} was alredy added`);
            return;
        }

        const existingPanels = Array.from(this._panels.values());
        let newPanels = [...existingPanels, newPanel];
        newPanels = orderBy(newPanels, "order", "asc");
        this._panels = new Map(newPanels.map((p) => [p.name, p]));
        this._buildNavigationMenu();
        this._handleInitActive();
    }

    initDomElements(domElements) {
        const { main, leftPanel, navigation } = domElements;
        this._domElements = { main, leftPanel, navigation };
        this._buildNavigationMenu();
    }

    initFinalize() {
        Promise.all(this._initPromises).then(() => {
            this._handleInitActive();
            if (!this._initialized) {
                this._activateFirstPanel();
                this._panelsReady.resolve();
                this._initialized = true;
            }
            this._initPromises = undefined;
        });
    }

    async addPanels(panelsInfo) {
        let panels = panelsInfo;
        if (!Array.isArray(panelsInfo)) {
            panels = [panelsInfo];
        }

        const promises = panels.filter((p) => p instanceof Promise);
        promises.forEach((p) =>
            p.then((panelInfo) => {
                this._makePanel(panelInfo);
            })
        );

        if (!this._initialized) {
            this._initPromises.push(...promises);
        }

        const readyPanels = panels.filter((p) => !(p instanceof Promise));
        readyPanels.forEach((panelInfo) => {
            this._makePanel(panelInfo);
        });
    }

    getPanel(name) {
        return this._panels.get(name);
    }

    get panelsReady() {
        return this._panelsReady;
    }
}
