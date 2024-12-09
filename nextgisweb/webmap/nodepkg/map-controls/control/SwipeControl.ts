import type { Map as OlMap } from "ol";
import { Control } from "ol/control";
import type { Layer } from "ol/layer";
import type RenderEvent from "ol/render/Event";
import "./Swipe.css";

interface SwipeOptions {
    className?: string;
    layers?: Layer[];
    position?: number;
    orientation?: "vertical" | "horizontal";
}

export class Swipe extends Control {
    layers: Layer[] = [];
    private position: number;
    private orientation: "vertical" | "horizontal";
    private isDragging = false;

    constructor(options: SwipeOptions = {}) {
        const element = document.createElement("div");
        element.className = `${options.className || "ol-swipe"} ol-unselectable ol-control`;

        const button = document.createElement("button");
        element.appendChild(button);

        super({ element });

        this.layers = options.layers || [];
        this.position = options.position || 0.5;
        this.orientation = options.orientation || "vertical";

        this.setupDragHandlers();
        this.updateControlStyle();
    }

    setMap(map: OlMap | null): void {
        if (this.getMap()) {
            this.layers.forEach((layer) => {
                layer.un("prerender", this.precompose);
                layer.un("postrender", this.postcompose);
            });
            this.getMap()?.render();
        }

        super.setMap(map);

        if (map) {
            this.layers.forEach((layer) => {
                layer.on("prerender", this.precompose.bind(this));
                layer.on("postrender", this.postcompose.bind(this));
            });
            map.render();
        }
    }

    addLayers(layers: Layer[]): void {
        layers.forEach((layer) => {
            if (!this.layers.includes(layer)) {
                this.layers.push(layer);
                if (this.getMap()) {
                    layer.on("prerender", this.precompose.bind(this));
                    layer.on("postrender", this.postcompose.bind(this));
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
        if (this.orientation === "vertical") {
            element.style.left = `${this.position * 100}%`;
            element.style.top = "";
        } else {
            element.style.top = `${this.position * 100}%`;
            element.style.left = "";
        }

        element.classList.remove("vertical", "horizontal");
        element.classList.add(this.orientation);
    }

    private precompose(event: RenderEvent): void {
        const ctx = event.context;
        if (ctx && "beginPath" in ctx) {
            const canvas = ctx.canvas;
            const position = this.position;
            const isVertical = this.orientation === "vertical";

            const width = isVertical ? canvas.width * position : canvas.width;
            const height = isVertical
                ? canvas.height
                : canvas.height * position;

            ctx.save();
            ctx.beginPath();
            ctx.rect(0, 0, width, height);
            ctx.clip();
        }
    }

    private postcompose(e: RenderEvent): void {
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
    }
}
