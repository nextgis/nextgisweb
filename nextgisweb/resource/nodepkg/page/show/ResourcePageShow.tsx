import { zip } from "lodash-es";
import { useEffect, useMemo, useState } from "react";

import { Flex, Spin } from "@nextgisweb/gui/antd";
import { assert } from "@nextgisweb/jsrealm/error";
import { useRouteGet } from "@nextgisweb/pyramid/hook";
import type {
    ResourceSection,
    ResourceSectionProps,
} from "@nextgisweb/resource/resource-section";

import { LoadingOutlined } from "@ant-design/icons";

type SectionConfig = { module: string; props: NonNullable<unknown> };

function useComponents(
    sectionsConfig: SectionConfig[]
): ResourceSection[] | undefined {
    const [result, setResult] = useState<ResourceSection[] | undefined>();
    const [error, setError] = useState<unknown>();

    useEffect(() => {
        (async () => {
            try {
                const modules = await Promise.all(
                    sectionsConfig.map(({ module }) =>
                        ngwEntry<{ default: ResourceSection }>(module)
                    )
                );
                setResult(modules.map((m) => m.default));
            } catch (err) {
                setError(err);
            }
        })();
    }, [sectionsConfig]);

    if (error) throw error;
    return result;
}

interface ResourcePageShowProps {
    resourceId: number;
    sectionsConfig: SectionConfig[];
}

export function ResourcePageShow({
    resourceId,
    sectionsConfig,
}: ResourcePageShowProps) {
    const { data: resourceData, error: resourceError } = useRouteGet({
        name: "resource.item",
        params: { id: resourceId },
        options: { cache: true },
    });

    const components = useComponents(sectionsConfig);

    const [hidden, setHidden] = useState(new Set<number>());

    const sections = useMemo(() => {
        if (!components || !resourceData) return;
        return zip(sectionsConfig, components).map(
            ([config, component], key) => {
                assert(config && component);
                const props: ResourceSectionProps = {
                    resourceId,
                    resourceData,
                    ...config.props,

                    hideSection() {
                        setHidden((current) => {
                            const value = new Set(current);
                            value.add(key);
                            return value;
                        });
                    },
                };
                return { key, component, props };
            }
        );
    }, [components, resourceData, resourceId, sectionsConfig]);

    if (resourceError) throw resourceError;
    if (!sections) {
        return (
            <Flex style={{ padding: "4em 8em" }} vertical>
                <Spin size="large" indicator={<LoadingOutlined spin />} />
            </Flex>
        );
    }

    return (
        <>
            {sections
                .filter(({ key }) => !hidden.has(key))
                .map(({ component: Component, key, props }) => (
                    <div key={key} style={{ marginBlockEnd: "2em" }}>
                        {Component.title && <h2>{Component.title}</h2>}
                        <Component {...props} />
                    </div>
                ))}
        </>
    );
}
