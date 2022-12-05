/** @entrypoint */
import ReactDOM from "react-dom";
import { ConfigProvider } from "./antd";

export default function reactApp(Component, props, domNode) {
    ReactDOM.render(
        <ConfigProvider>
            <Component {...props} />
        </ConfigProvider>,
        domNode
    );

    const unmount = () => {
        ReactDOM.unmountComponentAtNode(domNode);
    };

    return {
        ref: domNode,
        unmount,
        update: (newProps) => {
            reactApp(Component, { ...props, ...newProps }, domNode);
        },
    };
}
