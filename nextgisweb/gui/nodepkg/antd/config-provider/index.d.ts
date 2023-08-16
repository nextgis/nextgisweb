/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from "react";
import { ConfigProviderProps } from "antd/es/config-provider";

declare const ConfigProvider: React.ForwardRefExoticComponent<
    ConfigProviderProps & React.RefAttributes<any>
>;

export default ConfigProvider;
