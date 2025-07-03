import classNames from "classnames";
import type {
    ComponentPropsWithRef,
    FunctionComponent,
    PropsWithChildren,
    ReactNode,
    Ref,
} from "react";

import { useThemeVariables } from "@nextgisweb/gui/hook";

import { PanelTitle } from "./PanelTitle";
import type { PanelTitleProps } from "./PanelTitle";

import "./PanelContainer.less";

export interface PanelContainerComponents {
    title?: FunctionComponent<PanelTitleProps>;
    prolog?: FunctionComponent<ComponentPropsWithRef<"div">>;
    content?: FunctionComponent<ComponentPropsWithRef<"div">>;
    epilog?: FunctionComponent<ComponentPropsWithRef<"div">>;
}

export interface PanelContainerProps extends PropsWithChildren {
    ref?: Ref<HTMLDivElement>;
    className?: string;
    title?: ReactNode;
    suffix?: ReactNode;
    close: () => void;
    prolog?: ReactNode;
    epilog?: ReactNode;
    sectionAccent?: boolean;
    components?: PanelContainerComponents;
}

export function Padded({
    className,
    ref,
    ...props
}: ComponentPropsWithRef<"div">) {
    return (
        <div
            ref={ref}
            className={classNames(className, "ngw-webmap-panel-padded")}
            {...props}
        />
    );
}

export function Unpadded({
    ref,
    className,
    ...props
}: ComponentPropsWithRef<"div">) {
    return <div ref={ref} className={classNames(className)} {...props} />;
}

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
    ref,
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
            ref={ref}
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
