import { PropTypes } from "prop-types";

export const FileUploaderType = {
    helpText: PropTypes.string,
    uploadText: PropTypes.string,
    dragAndDropText: PropTypes.string,
    showProgressInDocTitle: PropTypes.bool,
    onChange: PropTypes.func,
    inputProps: PropTypes.object,
    accept: PropTypes.string,
    height: PropTypes.string,
    fileMeta: PropTypes.object,
    setFileMeta: PropTypes.func,
};
