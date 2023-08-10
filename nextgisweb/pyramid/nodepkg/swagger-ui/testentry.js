/** @testentry react */
import { routeURL } from "@nextgisweb/pyramid/api";

import { SwaggerUI } from "./SwaggerUI";

export default function SwaggerTestEntry() {
    return (
        <SwaggerUI
            url={routeURL("pyramid.openapi_json_test")}
            supportedSubmitMethods={[]}
        />
    );
}
