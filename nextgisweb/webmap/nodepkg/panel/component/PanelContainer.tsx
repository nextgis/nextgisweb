import classNames from "classnames";
import { forwardRef } from "react";
import type {
    ComponentPropsWithoutRef,
    ForwardRefExoticComponent,
    FunctionComponent,
    PropsWithChildren,
    ReactNode,
} from "react";

import { useThemeVariables } from "@nextgisweb/gui/hook";

import { PanelTitle } from "./PanelTitle";
import type { PanelTitleProps } from "./PanelTitle";

import "./PanelContainer.less";

export interface PanelContainerCompoents {
    title?: FunctionComponent<PanelTitleProps>;
    prolog?: ForwardRefExoticComponent<ComponentPropsWithoutRef<"div">>;
    content?: ForwardRefExoticComponent<ComponentPropsWithoutRef<"div">>;
    epilog?: ForwardRefExoticComponent<ComponentPropsWithoutRef<"div">>;
}

export interface PanelContainerProps extends PropsWithChildren {
    className?: string;
    title?: ReactNode;
    suffix?: ReactNode;
    close: () => void;
    prolog?: ReactNode;
    epilog?: ReactNode;
    sectionAccent?: boolean;
    components?: PanelContainerCompoents;
}

const Padded = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<"div">>(
    ({ className, ...props }, ref) => (
        <div
            ref={ref}
            className={classNames(className, "ngw-webmap-panel-padded")}
            {...props}
        />
    )
);

Padded.displayName = "PanelContainer.Padded";

const Unpadded = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<"div">>(
    ({ className, ...props }, ref) => (
        <div ref={ref} className={classNames(className)} {...props} />
    )
);

Unpadded.displayName = "PanelContainer.Unpadded";

export function PanelContainer({
    className,
    title,
    suffix,
    close,
    prolog,
    epilog,
    sectionAccent,
    components = {},
    children,
}: PanelContainerProps) {
    const {
        title: Title = PanelTitle,
        prolog: Prolog = Padded,
        content: Content = Padded,
        epilog: Epilog = Padded,
    } = components;

    const themeVariables = useThemeVariables({
        "theme-color-border-secondary": "colorBorderSecondary",
    });

    return (
        <div
            className={classNames(
                "ngw-webmap-panel-container",
                { "ngw-webmap-panel-section-accent": sectionAccent },
                className
            )}
            style={themeVariables}
        >
            <Title
                className="ngw-webmap-panel-title"
                title={title}
                suffix={suffix}
                close={close}
            />
            {prolog && (
                <Prolog className="ngw-webmap-panel-prolog">{prolog}</Prolog>
            )}
            <Content className="ngw-webmap-panel-content">{children}</Content>
            {epilog && (
                <Epilog className="ngw-webmap-panel-epilog">{epilog}</Epilog>
            )}
        </div>
    );
}

PanelContainer.Padded = Padded;
PanelContainer.Unpadded = Unpadded;
