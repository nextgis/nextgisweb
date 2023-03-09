import PropTypes from "prop-types";
import { useMemo } from "react";

import { Code } from "@nextgisweb/gui/component/code";
import { useRouteGet } from "@nextgisweb/pyramid/hook/useRouteGet";
import { LoadingWrapper } from "@nextgisweb/gui/component";

export function JsonView(props) {
    const { data, isLoading } = useRouteGet(
        "resource.item",
        { id: props.id },
        { cache: true }
    );

    const body = useMemo(() => {
        return JSON.stringify(data, null, 2);
    }, [data]);

    if (isLoading) {
        return <LoadingWrapper />;
    }
    return <Code value={body} lang="json" readOnly lineNumbers></Code>;
}

JsonView.propTypes = {
    id: PropTypes.number,
};
