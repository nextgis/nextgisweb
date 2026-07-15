import { isValidElement, useCallback, useMemo } from "react";
import type { ComponentType, ReactElement, ReactNode } from "react";

import { Form, Space } from "@nextgisweb/gui/antd";

import type { ChildProps, FormItemProps } from "../type";

export function FormItem({
  prepend,
  append,
  label,
  required,
  input: Input,
  noStyle = true,
  ...props
}: FormItemProps) {
  const memoizedInputComponent: ReactElement | null = useMemo(() => {
    if (isValidElement(Input)) {
      return Input;
    }
    if (typeof Input === "function" || typeof Input === "object") {
      const Component: ComponentType<ChildProps> =
        Input as ComponentType<ChildProps>;
      return <Component />;
    }
    return null;
  }, [Input]);

  const wrapWithSpaceIfNeeded = useCallback(
    (children: ReactNode) => {
      return prepend || append ? (
        <Space.Compact block>
          {prepend}
          {children}
          {append}
        </Space.Compact>
      ) : (
        children
      );
    },
    [append, prepend]
  );

  return (
    <Form.Item label={label} required={required}>
      {wrapWithSpaceIfNeeded(
        <Form.Item {...props} noStyle={noStyle}>
          {memoizedInputComponent}
        </Form.Item>
      )}
    </Form.Item>
  );
}
