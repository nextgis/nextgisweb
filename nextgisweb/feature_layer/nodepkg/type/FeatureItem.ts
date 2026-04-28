export type FeatureItemExtensions = Record<string, unknown | null>;

export type NgwAttributeType = string | number | boolean | null;

export type Attrs = Record<string, NgwAttributeType>;

export interface FeatureItem<F extends Attrs = Attrs> {
  id: number;
  vid?: number;
  label?: string;
  geom: string;
  fields: F;
  extensions: FeatureItemExtensions;
}
