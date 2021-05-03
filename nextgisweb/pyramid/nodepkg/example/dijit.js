/** @entrypoint */
import "./dijit.css";
import { default as Dialog } from "dijit/Dialog";

export default async () => {
    const dlg = new Dialog({
        title: "Some title",
        content: "Hello from dijit/Dialog test!<br/>CSS colored <span class=\"test-red\">red text</span>!"
    });
    dlg.show();
}
