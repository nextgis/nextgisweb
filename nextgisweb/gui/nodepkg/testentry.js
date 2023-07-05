/** @plugin jsrealm.testentry react */
import reactAppMod from "@nextgisweb/gui/react-app";
const reactApp = reactAppMod.default;

export default function(module, el) {
    const wrapper = document.createElement('div');
    el.appendChild(wrapper);
    reactApp(module, {}, wrapper);
}
