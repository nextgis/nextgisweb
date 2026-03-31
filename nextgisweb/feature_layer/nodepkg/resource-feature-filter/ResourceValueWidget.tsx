import { LookupSelect } from "@nextgisweb/lookup-table/component/lookup-select";
import type { LookupValue } from "@nextgisweb/lookup-table/component/lookup-select/LookupSelect";

import { DefaultFilterValueInput } from "../feature-filter/component/DefaultFilterValueInput";
import type { FilterValueWidgetProps } from "../feature-filter/type";

interface ResourceValueWidgetProps extends FilterValueWidgetProps {
  resourceId: number;
}

export function ResourceValueWidget({
  resourceId,
  ...props
}: ResourceValueWidgetProps) {
  const { field, operator, value, disabled, placeholder, onChange } = props;

  const isMultiple = operator === "in" || operator === "!in";

  if (field.lookupTable) {
    return (
      <LookupSelect
        value={value as LookupValue[]}
        lookupId={field.lookupTable.id}
        placeholder={placeholder}
        disabled={disabled}
        onChange={onChange}
        style={{ width: "100%" }}
        mode={isMultiple ? "multiple" : undefined}
      />
    );
  }

  return <DefaultFilterValueInput {...props} />;
}
