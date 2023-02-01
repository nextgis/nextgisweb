import {useMemo, useState} from "react";
import {Tree} from "@nextgisweb/gui/antd";
import FolderClosedIcon from "@material-icons/svg/folder/outline";
import FolderOpenIcon from "@material-icons/svg/folder_open/outline";
import DescriptionIcon from "@material-icons/svg/description/outline";
import EditIcon from "@material-icons/svg/edit/outline";

import {DropdownActions} from "./DropdownActions";
import PropTypes from "prop-types";

import "./LayersTree.less";


const handleWebMapItem = (webMapItem) => {
    if (webMapItem.type === "root" || webMapItem.type === "group") {
        webMapItem.icon = ({expanded}) => expanded ? <FolderOpenIcon/> : <FolderClosedIcon/>;
    } else if (webMapItem.type === "layer") {
        webMapItem.icon = (item) => {
            if (item.editable && item.editable === true) {
                return <EditIcon/>;
            } else {
                return <DescriptionIcon/>;
            }
        };
    }

    if (webMapItem.children) {
        webMapItem.children.forEach(handleWebMapItem);
    }
};

const prepareWebMapItems = (webMapItems) => {
    webMapItems.forEach(handleWebMapItem);
    return webMapItems;
};

export function LayersTree({
                               webMapItems, expanded, checked,
                               onCheckChanged, onSelect,
                               getWebmapPlugins
                           }) {
    const [expandedKeys, setExpandedKeys] = useState(expanded);
    const [checkedKeys, setCheckedKeys] = useState(checked);
    const [selectedKeys, setSelectedKeys] = useState([]);
    const [autoExpandParent, setAutoExpandParent] = useState(true);
    const [moreClickId, setMoreClickId] = useState(undefined);
    const [update, setUpdate] = useState(false);

    const treeItems = useMemo(() => prepareWebMapItems(webMapItems), [webMapItems]);

    const onExpand = (expandedKeysValue) => {
        setExpandedKeys(expandedKeysValue);
        setAutoExpandParent(false);
    };

    const onCheck = (checkedKeysValue) => {
        const checked = checkedKeysValue.filter((x) => !checkedKeys.includes(x));
        const unchecked = checkedKeys.filter((x) => !checkedKeysValue.includes(x));
        if (onCheckChanged) onCheckChanged({checked, unchecked});
        setCheckedKeys(checkedKeysValue);
    };

    const _onSelect = (selectedKeysValue) => {
        setSelectedKeys(selectedKeysValue);
        if (onSelect) onSelect(selectedKeysValue);
    };

    const titleRender = (nodeData) => {
        const {title} = nodeData;
        return <>
            <span className="title">{title}</span>
            <span className="more">
                <DropdownActions
                    nodeData={nodeData}
                    getWebmapPlugins={getWebmapPlugins}
                    setMoreClickId={setMoreClickId}
                    moreClickId={moreClickId}
                    update={update}
                    setUpdate={setUpdate}
                />
            </span>
        </>;
    };

    return <Tree
        className="ngw-webmap-layers-tree"
        checkable
        showIcon
        onExpand={onExpand}
        expandedKeys={expandedKeys}
        autoExpandParent={autoExpandParent}
        onCheck={onCheck}
        checkedKeys={checkedKeys}
        onSelect={_onSelect}
        selectedKeys={selectedKeys}
        treeData={treeItems}
        titleRender={titleRender}
    />;
}

LayersTree.propTypes = {
    webMapItems: PropTypes.array,
    expanded: PropTypes.array,
    checked: PropTypes.array,
    onCheckChanged: PropTypes.func,
    onSelect: PropTypes.func,
    getWebmapPlugins: PropTypes.func
};
