import { DeleteIcon, EditIcon } from "@nextgisweb/gui/icon";
import { gettext } from "@nextgisweb/pyramid/i18n";

import type { IconComponent } from "@nextgisweb/icon/index";
import CreateIcon from "@nextgisweb/icon/material/add_box";
import AttributeIcon from "@nextgisweb/icon/material/docs";
import MoveIcon from "@nextgisweb/icon/material/open_with";

export const EDITING_STATES = {
    MOVING: "movingFeatures",
    CREATING: "creatingFeatures",
    DELETING: "deletingFeatures",
    MODIFYING: "modifyingFeatures",
    ATTRIBUTE_EDITING: "editingAttribute",
} as const;

export type EditingState = (typeof EDITING_STATES)[keyof typeof EDITING_STATES];

export const INTERACTION_KEYS = {
    MODIFY: "modify",
    MOVE: "move",
    DRAW: "draw",
    SNAP: "snap",
} as const;

export type InteractionKey =
    (typeof INTERACTION_KEYS)[keyof typeof INTERACTION_KEYS];

export const editingModes: [mode: string, IconComponent, title: string][] = [
    [EDITING_STATES.MODIFYING, EditIcon, gettext("Modifying")],
    [EDITING_STATES.MOVING, MoveIcon, gettext("Moving")],
    [EDITING_STATES.CREATING, CreateIcon, gettext("Creating")],
    [EDITING_STATES.DELETING, DeleteIcon, gettext("Deleting")],
    [
        EDITING_STATES.ATTRIBUTE_EDITING,
        AttributeIcon,
        gettext("Attribute editing"),
    ],
];
