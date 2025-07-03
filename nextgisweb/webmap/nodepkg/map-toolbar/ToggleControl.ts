import type { ToolBase } from "../map-controls/tool/ToolBase";

import { WidgetBase } from "./WidgetBase";

export interface ToggleButtonOptions {
    label?: string;
    tool?: ToolBase;
    class?: string;
    state?: string;
    showLabel?: boolean;
    // TODO: figured out what does it mean and шs it still required?
    intermediateChanges?: boolean;
    checked?: boolean;
    disabled?: boolean;
}

export class ToggleControl extends WidgetBase {
    content: string;
    tool?: ToolBase;
    state: string;
    buttonNode: HTMLButtonElement;
    iconNode: HTMLElement | null;
    titleNode: HTMLElement;
    containerNode: HTMLElement;

    private showLabel: boolean;
    private checked: boolean;
    private disabled: boolean;
    private changeEventHandler?: (checked: boolean) => void;
    private clickEventHandler?: (event: MouseEvent) => void;

    constructor(options: ToggleButtonOptions) {
        super();
        this.content = options.label || "";
        this.tool = options.tool;
        this.state = options.state || "";
        this.showLabel = options.showLabel ?? true;
        this.checked = options.checked ?? false;
        this.disabled = options.disabled ?? false;

        this.buttonNode = document.createElement("button");
        this.buttonNode.type = "button";
        this.buttonNode.className = this._buildClassName(options.class);

        this.containerNode = document.createElement("span");
        this.containerNode.className = "toggle-button-container";
        this.buttonNode.appendChild(this.containerNode);

        this.titleNode = document.createElement("span");
        this.titleNode.className = "toggle-button-label";
        this.containerNode.appendChild(this.titleNode);

        this.iconNode = null;

        this.domNode.appendChild(this.buttonNode);
        this.domNode.className = "ol-control ol-unselectable";

        this._setContent(this.content);
        this._setAccessibility();
        this._setupEventListeners();

        this.startup();
    }

    postCreate(): void {
        super.postCreate();

        if (this.tool?.customIcon) {
            if (this.iconNode) {
                this.iconNode.remove();
            }

            this.iconNode = this._createIconNode(this.tool.customIcon);

            if (this.iconNode) {
                this.containerNode.insertBefore(this.iconNode, this.titleNode);
            }
        }

        this._updateState();
    }

    activate(): void {
        if (!this.disabled) {
            this.setChecked(true);
            this.tool?.activate?.();
        }
    }

    deactivate(): void {
        if (!this.disabled) {
            this.setChecked(false);
            this.tool?.deactivate?.();
        }
    }

    setChecked(checked: boolean): void {
        const isValid = this.tool?.validate?.(checked) ?? true;
        if (isValid) {
            if (this.checked !== checked && !this.disabled) {
                this.checked = checked;
                this._updateState();
            }
        }
    }

    isChecked(): boolean {
        return this.checked;
    }

    setDisabled(disabled: boolean): void {
        if (this.disabled !== disabled) {
            this.disabled = disabled;
            this._updateState();
        }
    }

    isDisabled(): boolean {
        return this.disabled;
    }

    setContent(content: string): void {
        this.content = content;
        this._setContent(content);
    }

    setState(state: string): void {
        this.state = state;
        this._updateState();
    }

    onChange(callback: (checked: boolean) => void): void {
        this.changeEventHandler = callback;
    }

    onClick(callback: (event: MouseEvent) => void): void {
        this.clickEventHandler = callback;
    }

    triggerChange(): void {
        if (this.changeEventHandler) {
            this.changeEventHandler(this.checked);
        }
        if (this.checked) {
            this.tool?.activate?.();
        } else {
            this.tool?.deactivate?.();
        }
    }

    destroy(): void {
        if (this.tool?.destroy) {
            this.tool.destroy();
        }
        this.tool = undefined;
        this.changeEventHandler = undefined;
        this.clickEventHandler = undefined;
        super.destroy();
    }

    private _createIconNode(customIcon: string): HTMLElement {
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = customIcon.trim();
        const iconElement = tempDiv.firstElementChild as HTMLElement;
        iconElement.className = "ol-control__icon";
        return iconElement;
    }

    private _updateState(): void {
        this.buttonNode.className = this._buildClassName(
            this.buttonNode.className
        );
        this.buttonNode.classList.toggle("checked", this.checked);
        this.buttonNode.classList.toggle("disabled", this.disabled);

        this.buttonNode.setAttribute("aria-pressed", String(this.checked));
        this.buttonNode.setAttribute("aria-disabled", String(this.disabled));

        this.buttonNode.disabled = this.disabled;
    }

    private _buildClassName(baseClass?: string): string {
        const classes = ["toggle-button"];
        if (baseClass) classes.push(baseClass);
        if (this.state) classes.push(this.state);
        return classes.join(" ");
    }

    private _setContent(content: string): void {
        if (this.showLabel) {
            this.titleNode.textContent = content;
        } else {
            this.titleNode.textContent = "";
            this.buttonNode.title = content;
        }
    }

    private _setAccessibility(): void {
        this.buttonNode.setAttribute("role", "button");
        this.buttonNode.setAttribute("aria-pressed", String(this.checked));
        if (this.disabled) {
            this.buttonNode.setAttribute("aria-disabled", "true");
        }
    }

    private _setupEventListeners(): void {
        this.buttonNode.addEventListener("click", (event: MouseEvent) => {
            if (this.disabled) {
                event.preventDefault();
                event.stopPropagation();
                return;
            }

            this.setChecked(!this.checked);
            this.triggerChange();

            if (this.clickEventHandler) {
                this.clickEventHandler(event);
            }
        });

        this.buttonNode.addEventListener("keydown", (event: KeyboardEvent) => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                this.buttonNode.click();
            }
        });
    }
}
