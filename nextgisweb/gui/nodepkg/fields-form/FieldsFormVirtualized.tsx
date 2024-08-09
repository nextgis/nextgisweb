import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef } from "react";
import type React from "react";

import { FormItem } from "./FormItem";
import type { FieldsFormProps } from "./type";

export function FieldsFormVirtualized<
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    P extends Record<string, any> = Record<string, any>,
>({
    fields,
    children,
}: {
    fields: FieldsFormProps<P>["fields"];
    children: React.ReactNode;
}) {
    const parentRef = useRef<HTMLDivElement>(null);

    const rowVirtualizer = useVirtualizer({
        count: fields.length,
        getScrollElement: () => parentRef.current,
        // TODO: mesure this value from real html rendered block
        estimateSize: () => 56,
    });

    const virtualItems = rowVirtualizer.getVirtualItems().map((virtualItem) => {
        const item = fields[virtualItem.index];
        return (
            <div
                key={item.name}
                style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${virtualItem.start}px)`,
                }}
            >
                <FormItem {...item} />
            </div>
        );
    });

    return (
        <div
            ref={parentRef}
            style={{
                height: "100%",
                overflowY: "auto",
                boxSizing: "border-box",
                padding: "1rem",
            }}
        >
            <div
                style={{
                    height: `${rowVirtualizer.getTotalSize()}px`,
                    width: "100%",
                    position: "relative",
                }}
            >
                {virtualItems}
            </div>
            {children}
        </div>
    );
}
