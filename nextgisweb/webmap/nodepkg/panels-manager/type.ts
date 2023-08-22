export type DojoDisplay = DojoItem;
export type DojoPanel = PanelDojoItem;

export interface DojoItem extends HTMLElement {
    set: (key: string, value: unknown) => void;
    domNode: HTMLElement;
    on?: (eventName: string, callback: (panel: PanelDojoItem) => void) => void;
    addChild: (child: DojoItem) => void;
}

export interface PanelDojoItem extends DojoItem {
    name: string;
    menuIcon?: string;
    title: string;

    order?: number;
    cls?: new (params: PanelClsParams) => PanelDojoItem;
    params: PanelClsParams;

    isFullWidth?: boolean;
    show: () => void;
    hide: () => void;
}

export interface PanelClsParams {
    display: DojoDisplay;
    menuIcon: string;
    name: string;
    order: number;
    title: string;
    splitter: boolean;
}
