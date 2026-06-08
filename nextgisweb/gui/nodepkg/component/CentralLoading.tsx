import type { CSSProperties } from "react";

import { Spin } from "../antd";

export function CentralLoading({
  style,
  indicatorStyle,
}: {
  style?: CSSProperties;
  indicatorStyle?: CSSProperties;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100%",
        width: "100%",
        ...style,
      }}
    >
      <Spin styles={{ indicator: { fontSize: 24, ...indicatorStyle } }} />
    </div>
  );
}
