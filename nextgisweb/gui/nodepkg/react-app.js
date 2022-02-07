/** @entrypoint */
import ReactDOM from "react-dom";
import { ConfigProvider } from "./antd";

export default function (Component, props, domNode) {
    ReactDOM.render(
        <ConfigProvider>
            <Component {...props} />
        </ConfigProvider>,
        domNode
    );
}
