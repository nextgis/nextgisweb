/** @entrypoint */
import { StrictMode } from "react";
import ReactDOM from "react-dom";
import { ConfigProvider } from "./antd";

export default function (Component, props, domNode) {
    ReactDOM.render(
        <StrictMode>
            <ConfigProvider>
                <Component {...props} />
            </ConfigProvider>
        </StrictMode>,
        domNode
    );
}
