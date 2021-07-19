/** @entrypoint */
import "./OverlayDialog.css";
import { default as declare } from "dojo/_base/declare";
import { default as Dialog } from "dijit/Dialog";

export { OverlayDialog };

const OverlayDialog = declare([Dialog], {
    draggable: false,

    buildRendering: function buildRendering () {
        this.inherited(buildRendering, arguments);
        this.domNode.classList.add("overlay-dlg");
    },

    resize: () => {},
});
