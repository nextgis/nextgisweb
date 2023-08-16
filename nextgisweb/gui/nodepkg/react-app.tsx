/** @entrypoint */
import { createRoot } from "react-dom/client";
import { ConfigProvider } from "./antd";

type PropsType = Record<string, unknown>;

export default function reactApp<P extends PropsType = PropsType>(
    Component: React.ComponentType<P>,
    props: P,
    domNode: HTMLElement
) {
    const root = createRoot(domNode);

    root.render(
        <ConfigProvider>
            <Component {...props} />
        </ConfigProvider>
    );

    const unmount = () => {
        root.unmount();
    };

    return {
        ref: domNode,
        unmount,
        update: (newProps: P) => {
            reactApp(Component, { ...props, ...newProps }, domNode);
        },
    };
}
