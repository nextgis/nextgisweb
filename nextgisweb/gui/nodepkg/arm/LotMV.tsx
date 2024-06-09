import { observer } from "mobx-react-lite";
import { createElement } from "react";
import type { ReactNode } from "react";

import { Lot } from "@nextgisweb/gui/mayout";
import type { LotProps } from "@nextgisweb/gui/mayout";

import type { MappedValue } from "./mapper";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface LotMVProps<V, C extends (props: any) => ReactNode>
    extends Omit<LotProps, "children"> {
    value: MappedValue<V>;
    component: C;
    props?: Parameters<C> extends [infer P] ? P : never;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function LotMVBase<V, C extends (props: any) => ReactNode>({
    value,
    component,
    props,
    ...lotProps
}: LotMVProps<V, C>) {
    const componentProps = value.cprops();
    Object.assign(componentProps, props);

    return (
        <Lot error={value.error} {...lotProps}>
            {createElement(component, componentProps)}
        </Lot>
    );
}

export const LotMV = observer(LotMVBase);
LotMV.displayName = "LotMV";
