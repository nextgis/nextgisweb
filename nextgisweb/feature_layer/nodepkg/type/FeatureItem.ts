export type FeatureItemExtensions = Record<string, unknown | null>;

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue }
  | JsonValue[];

export type NgwAttributeType = JsonValue;

export type Attrs = Record<string, NgwAttributeType>;

export interface FeatureItem<F extends Attrs = Attrs> {
  id: number;
  vid?: number;
  label?: string;
  geom: string;
  fields: F;
  extensions: FeatureItemExtensions;
}
