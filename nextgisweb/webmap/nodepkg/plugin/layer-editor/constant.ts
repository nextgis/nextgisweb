export const EDITING_STATES = {
    HOLE: "cutingHoles",
    MOVING: "movingFeatures",
    CREATING: "creatingFeatures",
    DELETING: "deletingFeatures",
    MODIFYING: "modifyingFeatures",
    ATTRIBUTE_EDITING: "editingAttribute",
} as const;

export type EditingState = (typeof EDITING_STATES)[keyof typeof EDITING_STATES];
