import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { Provider as BalancedProvider } from "react-wrap-balancer";

import { ConfigProvider } from "./antd";

type PropsType = Record<string, any>;

const rootsMap = new Map<HTMLElement, Root>();

export interface ReactAppReturn<P extends PropsType = PropsType> {
    ref: HTMLElement;
    unmount: () => void;
    update: (newProps: Partial<P>) => void;
}

export default function reactApp<P extends PropsType = PropsType>(
    Component: React.ComponentType<P>,
    props: P,
    domNode: HTMLElement
): ReactAppReturn<P> {
    let root = rootsMap.get(domNode);

    if (!root) {
        root = createRoot(domNode);
        rootsMap.set(domNode, root);
    }

    root.render(
        <ConfigProvider wave={{ disabled: true }}>
            <BalancedProvider>
                <Component {...props} />
            </BalancedProvider>
        </ConfigProvider>
    );

    const unmount = () => {
        root!.unmount();
        rootsMap.delete(domNode);
    };

    return {
        ref: domNode,
        unmount,
        update: (newProps: Partial<P>) => {
            props = { ...props, ...newProps };
            reactApp(Component, props, domNode);
        },
    };
}
