export const EDITING_STATES = {
    MOVING: "movingFeatures",
    CREATING: "creatingFeatures",
    DELETING: "deletingFeatures",
    MODIFYING: "modifyingFeatures",
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
