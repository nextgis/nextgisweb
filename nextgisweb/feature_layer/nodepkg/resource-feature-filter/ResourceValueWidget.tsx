import { LookupSelect } from "@nextgisweb/lookup-table/component/lookup-select";
import type { LookupValue } from "@nextgisweb/lookup-table/component/lookup-select/LookupSelect";

import { DefaultFilterValueInput } from "../feature-filter/component/DefaultFilterValueInput";
import type { FilterValueWidgetProps } from "../feature-filter/type";

import { UniqueValueInput } from "./SuggestedValueInput";

interface ResourceValueWidgetProps extends FilterValueWidgetProps {
  resourceId: number;
}

export function ResourceValueWidget({
  resourceId,
  ...props
}: ResourceValueWidgetProps) {
  const { field, operator, value, placeholder } = props;

  const isMultiple = operator === "in" || operator === "!in";

  if (field.lookupTable) {
    return (
      <LookupSelect
        lookupId={field.lookupTable.id}
        placeholder={placeholder}
        style={{ width: "100%" }}
        mode={isMultiple ? "multiple" : undefined}
        {...props}
        value={value as LookupValue[]}
      />
    );
  }

  const supportsSuggestions =
    field.datatype === "STRING" && ["==", "!=", "in", "!in"].includes(operator);

  if (!supportsSuggestions || field.ref.kind !== "field") {
    return <DefaultFilterValueInput {...props} />;
  }

  return (
    <UniqueValueInput
      resourceId={resourceId}
      keyname={field.ref.keyname}
      placeholder={placeholder}
      isMultiple={isMultiple}
      style={{ width: "100%" }}
      {...props}
    />
  );
}
