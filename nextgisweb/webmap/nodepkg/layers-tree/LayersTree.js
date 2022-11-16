import {useEffect, useMemo, useState} from "react";
import {Tree} from "@nextgisweb/gui/antd";
import FolderIcon from "@material-icons/svg/folder";
import FolderOpenIcon from "@material-icons/svg/folder_open";
import DescriptionIcon from "@material-icons/svg/description";

import PropTypes from "prop-types";

import "./LayersTree.less";

const iconGroupStyle = {
    fontSize: "18px",
    color: "#c29e68"
};

const iconLayerStyle = {
    fontSize: "15px",
    color: "#759dc0"
};

const handleWebMapItem = (webMapItem) => {
    if (webMapItem.type === "root" || webMapItem.type === "group") {
        webMapItem.icon = ({expanded}) => expanded ?
            <FolderOpenIcon style={iconGroupStyle}/> :
            <FolderIcon style={iconGroupStyle}/>;
    } else if (webMapItem.type === "layer") {
        webMapItem.icon = <DescriptionIcon style={iconLayerStyle}/>;
    }

    if (webMapItem.children) {
        webMapItem.children.forEach((childItem) => {
            handleWebMapItem(childItem);
        });
    }
};

const prepareWebMapItems = (webMapItems) => {
    webMapItems.forEach(i => {
        handleWebMapItem(i);
    });
    return webMapItems;
};

export function LayersTree({webMapItems, expanded, checked, onCheckChanged, onSelect}) {
    const [expandedKeys, setExpandedKeys] = useState(expanded);
    const [checkedKeys, setCheckedKeys] = useState(checked);
    const [selectedKeys, setSelectedKeys] = useState([]);
    const [autoExpandParent, setAutoExpandParent] = useState(true);

    const treeItems = useMemo(() => prepareWebMapItems(webMapItems), [webMapItems]);

    const onExpand = (expandedKeysValue) => {
        setExpandedKeys(expandedKeysValue);
        setAutoExpandParent(false);
    };
    const onCheck = (checkedKeysValue) => {
        const checked = checkedKeysValue.filter(x => !checkedKeys.includes(x));
        const unchecked = checkedKeys.filter(x => !checkedKeysValue.includes(x));
        if (onCheckChanged) onCheckChanged({checked, unchecked});
        setCheckedKeys(checkedKeysValue);
    };
    const _onSelect = (selectedKeysValue) => {
        setSelectedKeys(selectedKeysValue);
        if (onSelect) onSelect(selectedKeysValue);
    };

    return (<>
        <Tree
            className="layers-tree"
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
        />
    </>);
}

LayersTree.propTypes = {
    webMapItems: PropTypes.array,
    expanded: PropTypes.array,
    checked: PropTypes.array,
    onCheckChanged: PropTypes.func,
    onSelect: PropTypes.func
};
