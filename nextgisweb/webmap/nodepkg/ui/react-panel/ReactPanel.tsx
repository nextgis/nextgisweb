import { Suspense, lazy } from "react";
import type { LazyExoticComponent } from "react";

import reactApp from "@nextgisweb/gui/react-app";
import type { ReactAppReturn } from "@nextgisweb/gui/react-app";
import entrypoint from "@nextgisweb/jsrealm/entrypoint";
import type { MapStatesObserver } from "@nextgisweb/webmap/map-state-observer/MapStatesObserver";
import type {
    ReactPanelComponentPropType,
    ReactPanelComponentProps,
} from "@nextgisweb/webmap/panels-manager/type";
import type {
    DojoDisplay,
    DojoItem,
    PanelClsParams,
    PanelDojoItem,
} from "@nextgisweb/webmap/type";

interface WidgetOptions<
    P extends ReactPanelComponentPropType = ReactPanelComponentPropType,
> {
    waitFor?: Promise<unknown>[];
    props?: Omit<P, keyof ReactPanelComponentProps>;
}

export class ReactPanel<
    P extends ReactPanelComponentPropType = ReactPanelComponentPropType,
> implements PanelDojoItem<P>
{
    domNode: HTMLElement;
    display!: DojoDisplay;

    title!: string;

    visible = false;
    menuIcon = "";
    close = () => {
        //
    };
    name!: string;
    order = 0;
    splitter = true;
    mapStates!: MapStatesObserver;
    content!: string;
    props?: Omit<P, keyof ReactPanelComponentProps>;

    app?: ReactAppReturn<P | ReactPanelComponentProps>;
    private fcomp?:
        | React.ComponentType<ReactPanelComponentProps>
        | LazyExoticComponent<React.ComponentType<ReactPanelComponentProps>>;

    constructor(
        private fcompProp:
            | (() => Promise<{
                  default: React.ComponentType<P>;
              }>)
            | React.ComponentType<P>,
        private options: WidgetOptions<P> = {},
        public params: PanelClsParams
    ) {
        Object.assign(this, params);
        this.props = options.props;
        this.params = params;
        this.domNode = document.createElement("div");
        this.domNode.style.height = "100%";
        this.domNode.title = ""; // Prevent useless tooltip
        this.options = options;
    }

    show() {
        this.updateVisible(true);
    }

    hide() {
        this.updateVisible(false);
    }

    startup() {}

    private updateVisible(visible: boolean) {
        if (this.app) {
            this.app.update({ visible });
        } else if (typeof this.fcompProp === "string") {
            // String condition is deprecated, kept for backward compatibility
            entrypoint(this.fcompProp).then((fcompMod) => {
                this.fcomp = (
                    fcompMod as {
                        default: React.ComponentType<ReactPanelComponentProps>;
                    }
                ).default;
                this.runReactApp({ visible });
            });
        } else if (typeof this.fcompProp === "function") {
            this.fcomp = lazy(
                this.fcompProp as () => Promise<{
                    default: React.ComponentType;
                }>
            );

            this.runReactApp({ visible });
        } else {
            this.fcomp = this.fcompProp;
            this.runReactApp({ visible });
        }
    }

    private async runReactApp({ visible }: { visible: boolean }) {
        const pm = this.display.panelsManager;
        await Promise.all(this.options.waitFor || []);

        const props: ReactPanelComponentProps = {
            display: this.display,
            title: this.title,
            close: () => {
                const activeKey = pm._activePanelKey;
                if (activeKey !== undefined) {
                    const activePanel = pm.getPanel(activeKey);
                    if (activePanel) {
                        pm._closePanel(activePanel);
                    }
                }
            },
            visible,
            ...this.props,
        };

        if (this.fcomp) {
            const Component = this.fcomp;
            const LazyWrapper = (lazyProps: ReactPanelComponentProps) => (
                <Suspense fallback={<div>...</div>}>
                    <Component {...(lazyProps ? lazyProps : props)} />
                </Suspense>
            );

            this.app = reactApp<ReactPanelComponentProps>(
                LazyWrapper,
                props,
                this.domNode
            );
        }
    }

    /** @deprecated */
    set = (_key: string, _value: unknown) => {
        console.warn(`Handle 'set' action for ${_key}`);
    };
    /** @deprecated */
    // @ts-expect-error no sense to repair this type
    on = (eventName: string, _callback: (panel: PanelDojoItem) => void) => {
        console.warn(`Handle 'on' event for ${eventName}`);
    };
    /** @deprecated */
    // @ts-expect-error no sense to repair this type
    addChild = (_child: DojoItem) => {
        console.warn(`Handle 'addChild' action`);
    };
    /** @deprecated */
    // @ts-expect-error no sense to repair this type
    get = (val: string) => {
        console.warn(`Handle 'get' action for ${val}`);
        return;
    };
    /** @deprecated */
    // @ts-expect-error no sense to repair this type
    removeChild = (_elem: PanelDojoItem) => {
        console.warn("Handle `removeChild` action");
    };
}

export function reactPanel<
    P extends ReactPanelComponentPropType = ReactPanelComponentPropType,
>(
    fcompProp:
        | (() => Promise<{
              default: React.ComponentType<P>;
          }>)
        | React.ComponentType<P>,
    options: WidgetOptions<P> = {}
) {
    return function createPanel(params: PanelClsParams) {
        return new ReactPanel(fcompProp, options, params);
    };
}