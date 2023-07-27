import type { FC } from "react";

type ParamsOf<T extends FC> = Parameters<T>[0];
export type ParamOf<T extends FC, K extends keyof ParamsOf<T>> = ParamsOf<T>[K];
