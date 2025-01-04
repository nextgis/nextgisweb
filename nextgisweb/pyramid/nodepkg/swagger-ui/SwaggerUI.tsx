import SwaggerUIReact from "swagger-ui-react";

import { routeURL } from "@nextgisweb/pyramid/api";

import "swagger-ui-react/swagger-ui.css";
import "./SwaggerUI.less";

const Plugin = () => {
    return {
        components: {
            InfoContainer: () => <></>,
        },
    };
};

const defaults = {
    plugins: [Plugin],
    url: routeURL("pyramid.openapi_json"),
    showCommonExtensions: true,
    deepLinking: true,
};

export function SwaggerUI({ ...props }) {
    props = Object.assign({ ...defaults }, props);
    return <SwaggerUIReact {...props} />;
}
