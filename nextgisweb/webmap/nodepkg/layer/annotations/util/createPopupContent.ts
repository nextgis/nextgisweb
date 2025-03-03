import { EditIcon } from "@nextgisweb/gui/icon";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { iconHtml } from "@nextgisweb/pyramid/icon";

const template = `
<div>
    <div class="annotation-description">
    </div>
    <div class="annotation-edit-controls">
        <span class="annotation-edit" title="${gettext("Edit annotation")}">
            ${iconHtml(EditIcon)}
        </span>
    </div>
</div>`;

export function createPopupContent() {
    const tempContainer = document.createElement("div");
    tempContainer.innerHTML = template;
    const content = tempContainer.firstElementChild as HTMLElement;

    const description = content.querySelector(
        ".annotation-description"
    ) as HTMLElement;
    const icon = content.querySelector(".icon") as HTMLElement;
    const edit = content.querySelector(".annotation-edit") as HTMLElement;
    const editControls = content.querySelector(
        ".annotation-edit-controls"
    ) as HTMLElement;

    return { content, description, icon, edit, editControls };
}
