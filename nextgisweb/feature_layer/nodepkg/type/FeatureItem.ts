export type FeatureItemExtensions = Record<string, unknown | null>;

export type NgwAttributeType = string | number | null;

export interface FeatureItem<
    F extends Record<string, NgwAttributeType> = Record<
        string,
        NgwAttributeType
    >,
> {
    id: number;
    geom: string;
    fields: F;
    extensions: FeatureItemExtensions;
}
