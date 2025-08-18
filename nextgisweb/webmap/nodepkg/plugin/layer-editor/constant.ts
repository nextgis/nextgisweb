export const EDITING_STATES = {
    CREATING: "creatingFeatures",
    MODIFYING: "modifyingFeatures",
    DELETING: "deletingFeatures",
} as const;

export type EditingState = (typeof EDITING_STATES)[keyof typeof EDITING_STATES];

export const INTERACTION_KEYS = {
    DRAW: "draw",
    MODIFY: "modify",
    SNAP: "snap",
} as const;

export type InteractionKey =
    (typeof INTERACTION_KEYS)[keyof typeof INTERACTION_KEYS];
