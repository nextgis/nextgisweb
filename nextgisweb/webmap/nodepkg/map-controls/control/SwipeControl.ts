import type { Map as OlMap } from "ol";
import { Control } from "ol/control";
import type { Layer } from "ol/layer";
import type RenderEvent from "ol/render/Event";

import { gettext } from "@nextgisweb/pyramid/i18n";
import { iconHtml } from "@nextgisweb/pyramid/icon";

import Icon from "@nextgisweb/icon/material/sync";

import "./SwipeControl.css";

type Orientation = "vertical" | "horizontal";

interface SwipeOptions {
    className?: string;
    layers?: Layer[];
    position?: number;
    orientation?: Orientation;
}

export class Swipe extends Control {
    layers: Layer[] = [];
    private position: number;
    private orientation: Orientation;
    private isReversed: boolean = false;
    private isDragging = false;
    private toggleButton: HTMLDivElement;

    constructor(options: SwipeOptions = {}) {
        const element = document.createElement("div");
        element.className = `${options.className || "ol-swipe"} ol-unselectable ol-control`;

        const button = document.createElement("button");
        element.appendChild(button);

        const toggleButton = document.createElement("div");
        toggleButton.className = "ol-swipe-toggle";
        toggleButton.innerHTML = iconHtml(Icon);
        toggleButton.title = gettext("Rotate swipe");
        element.appendChild(toggleButton);

        super({ element });

        this.toggleButton = toggleButton;
        this.layers = options.layers || [];
        this.position = options.position || 0.5;
        this.orientation = options.orientation || "vertical";

        this.setupDragHandlers();
        this.setupToggleHandler();
        this.updateControlStyle();
    }

    setMap(map: OlMap | null): void {
        const oldMap = this.getMap();
        if (oldMap) {
            this.layers.forEach((layer) => {
                layer.un("prerender", this.precompose);
                layer.un("postrender", this.postcompose);
            });

            oldMap.render();
        }

        super.setMap(map);

        if (map) {
            this.layers.forEach((layer) => {
                layer.on("prerender", this.precompose);
                layer.on("postrender", this.postcompose);
            });
            map.render();
        }
    }

    addLayers(layers: Layer[]): void {
        layers.forEach((layer) => {
            if (!this.layers.includes(layer)) {
                this.layers.push(layer);
                if (this.getMap()) {
                    layer.on("prerender", this.precompose);
                    layer.on("postrender", this.postcompose);
                    this.getMap()?.render();
                }
            }
        });
    }

    removeLayers(layers: Layer[]): void {
        layers.forEach((layer, idx) => {
            if (this.layers.includes(layer)) {
                if (this.getMap()) {
                    layer.un("prerender", this.precompose);
                    layer.un("postrender", this.postcompose);
                    this.layers.splice(idx, 1);
                    this.getMap()?.render();
                }
            }
        });
    }

    private setPosition(position: number): void {
        this.position = position;
        this.updateControlStyle();
        this.getMap()?.render();
    }

    private getNextState() {
        const states: {
            orientation: Orientation;
            isReversed: boolean;
        }[] = [
            { orientation: "vertical", isReversed: false },
            { orientation: "horizontal", isReversed: false },
            { orientation: "vertical", isReversed: true },
            { orientation: "horizontal", isReversed: true },
        ];

        const currentIndex = states.findIndex(
            (state) =>
                state.orientation === this.orientation &&
                state.isReversed === this.isReversed
        );
        return states[(currentIndex + 1) % states.length];
    }

    private setupToggleHandler(): void {
        this.toggleButton.addEventListener("click", (e: MouseEvent) => {
            e.stopPropagation();
            const nextState = this.getNextState();
            this.orientation = nextState.orientation;
            this.isReversed = nextState.isReversed;
            this.updateControlStyle();
            this.getMap()?.render();
        });
    }

    private setupDragHandlers(): void {
        this.element.addEventListener("mousedown", () => {
            this.isDragging = true;
        });

        document.addEventListener("mousemove", (e: MouseEvent) => {
            if (!this.isDragging) return;

            const map = this.getMap();
            if (!map) return;

            const mapElement = map.getTargetElement();
            const mapRect = mapElement.getBoundingClientRect();

            let position: number;
            if (this.orientation === "vertical") {
                const pageX = e.clientX - mapRect.left;
                position = Math.min(Math.max(0, pageX / mapRect.width), 1);
            } else {
                const pageY = e.clientY - mapRect.top;
                position = Math.min(Math.max(0, pageY / mapRect.height), 1);
            }

            this.setPosition(position);
        });

        document.addEventListener("mouseup", () => {
            this.isDragging = false;
        });
    }

    private updateControlStyle(): void {
        const element = this.element;
        const position = this.position;

        if (this.orientation === "vertical") {
            element.style.left = `${position * 100}%`;
            element.style.top = "";
        } else {
            element.style.top = `${position * 100}%`;
            element.style.left = "";
        }

        element.classList.remove("vertical", "horizontal", "reversed");
        element.classList.add(this.orientation);
        if (this.isReversed) {
            element.classList.add("reversed");
        }
    }

    private precompose = (e: RenderEvent): void => {
        const ctx = e.context;
        if (ctx && "beginPath" in ctx) {
            const { width, height } = ctx.canvas;
            const { orientation, position } = this;
            const isVertical = orientation === "vertical";

            const maskPosition = this.isReversed ? 1 - position : position;

            const [x, y, w, h] = [
                isVertical
                    ? this.isReversed
                        ? width - width * maskPosition
                        : 0
                    : 0,
                isVertical
                    ? 0
                    : this.isReversed
                      ? height - height * maskPosition
                      : 0,
                isVertical ? width * maskPosition : width,
                isVertical ? height : height * maskPosition,
            ];

            ctx.save();
            ctx.beginPath();
            ctx.rect(x, y, w, h);
            ctx.clip();
        }
    };

    private postcompose = (e: RenderEvent): void => {
        const restore = () => {
            if (e.context && "restore" in e.context) e.context.restore();
        };
        // restore context when decluttering is done
        // https://github.com/openlayers/openlayers/issues/10096
        if (
            e.target.getClassName() !== "ol-layer" &&
            e.target.get("declutter")
        ) {
            setTimeout(restore, 0);
        } else {
            restore();
        }
    };
}
