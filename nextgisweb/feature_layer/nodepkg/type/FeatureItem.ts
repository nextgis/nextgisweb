export type FeatureItemExtensions = Record<string, unknown | null>;

export interface NgwDate {
    year: number;
    month: number;
    day: number;
}
export interface NgwTime {
    hour: number;
    minute: number;
    second: number;
}

export type NgwDateTime = NgwTime & NgwDate;

export type NgwAttributeType =
    | string
    | number
    | null
    | NgwDate
    | NgwTime
    | NgwDateTime;

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
