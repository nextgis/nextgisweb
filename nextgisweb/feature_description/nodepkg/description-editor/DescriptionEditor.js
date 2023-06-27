import { PropTypes } from "prop-types";

import { observer } from "mobx-react-lite";
import { useMemo } from "react";

import { TextEditor } from "@nextgisweb/gui/component/text-editor";

export const DescriptionEditor = observer(({ store, extension }) => {
    const { extensions, setExtension } = store;

    const dataSource = useMemo(() => {
        return extensions[extension] || '';
    }, [extensions, extension]);

    const onChange = (value) => {
        if (!value) {
            value = null;
        }
        setExtension(extension, value);
    };

    return <TextEditor value={dataSource} onChange={onChange}></TextEditor>;
});

DescriptionEditor.propTypes = {
    store: PropTypes.object,
    extension: PropTypes.string,
};
