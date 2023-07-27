export type FeatureItemExtensions = Record<string, unknown | null>;

export interface FeatureItem<
    F extends Record<string, unknown> = Record<string, unknown>,
> {
    id: number;
    geom: string;
    fields: F;
    extensions: FeatureItemExtensions;
}
