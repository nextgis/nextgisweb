/** @entrypoint */
import { StrictMode  } from "react";
import ReactDOM from "react-dom";

export default function(Component, domNode) {
    ReactDOM.render(
        <StrictMode>
            <Component></Component>
        </StrictMode>,
        domNode,
    );
}
