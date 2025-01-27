import { gettext } from "@nextgisweb/pyramid/i18n";

const template = `
<div>
    <div class="annotation-description">
    </div>
    <div class="annotation-edit-controls">
        <span class="annotation-edit"
              title="${gettext("Edit annotation")}">
            <svg class="icon" fill="currentColor">
                <use xlink:href="#icon-material-edit"/>
            </svg>
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
