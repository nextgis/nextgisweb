/** @testentry react */
import { createElement } from "react";

import complileREJ from "../string-format/complileREJ";

const testTemplate = complileREJ("Hello, {first} {last}", false);
const compiledChildren = testTemplate({
    first: "im string",
    last: <span style={{ color: "tomato", fontSize: 32 }}>{"Kappa"}</span>,
});

const ReComp = createElement("fragment", {}, ...compiledChildren);

function InterpolationWithReactNodeTest() {
    return ReComp;
}

export default InterpolationWithReactNodeTest;
