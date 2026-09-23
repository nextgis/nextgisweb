import { route } from "@nextgisweb/pyramid/api";
import type { FieldDataItem } from "@nextgisweb/webmap/panel/identify/fields";
import { lookup } from "@nextgisweb/webmap/panel/identify/lookup";

export const loadSearchContext = async (
  resourceId: number,
  featureId: number,
  fieldIds: number[],
  signal: AbortSignal
): Promise<FieldDataItem[]> => {
  const allFields = (
    await route("resource.item", resourceId).get({ cache: true })
  ).feature_layer?.fields;
  const fieldsById = new Map((allFields ?? []).map((f) => [f.id, f]));
  const matchedFields = fieldIds
    .map((id) => fieldsById.get(id))
    .filter((f) => f !== undefined);

  const feature = await route(
    "feature_layer.feature.item",
    resourceId,
    featureId
  ).get({
    query: {
      fields: matchedFields.map((f) => f.keyname),
      geom: false,
      dt_format: "iso",
    },
    cache: true,
    signal,
  });

  return Promise.all(
    matchedFields.map(async (field) => {
      const rawValue = feature.fields[field.keyname];
      let value: string;

      if (rawValue === null || rawValue === undefined) {
        value = "";
      } else {
        value = String(rawValue);
        if (field.lookup_table) {
          const label = await lookup(field.lookup_table.id, value, {
            signal,
          });
          if (label !== null) {
            value = `[${value}] ${label}`;
          }
        }
      }

      return {
        key: field.id,
        attr: field.display_name,
        value,
      };
    })
  );
};
