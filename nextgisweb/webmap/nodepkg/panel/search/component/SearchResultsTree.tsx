import { useState } from "react";
import type { Key, MouseEvent } from "react";

import { Col, Row, Tree } from "@nextgisweb/gui/antd";
import type { TreeDataNode } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type { Display } from "@nextgisweb/webmap/display";

import type { SearchResult, SearchResultGroup } from "../type";

import IdentifyIcon from "@nextgisweb/icon/material/arrow_selector_tool";
import LayersIcon from "@nextgisweb/icon/material/layers";
import LocationOnIcon from "@nextgisweb/icon/material/location_on";
import PublicIcon from "@nextgisweb/icon/material/public";

import "./SearchResultsTree.less";

type ResultTreeNode = TreeDataNode & { result?: SearchResult };

export function SearchResultsTree({
  groups,
  display,
  collapsedGroups,
  onCollapsedGroupsChange,
}: {
  groups: SearchResultGroup[];
  display: Display;
  collapsedGroups: Set<string>;
  onCollapsedGroupsChange: (next: Set<string>) => void;
}) {
  const [resultSelected, setResultSelected] = useState<
    SearchResult | undefined
  >(undefined);

  const selectResult = (resultInfo: SearchResult) => {
    setResultSelected(resultInfo);

    display.map.zoomToGeom(resultInfo.geometry);

    display.highlighter.highlight({ geom: resultInfo.geometry });
  };

  const onIdentifyIconClick = (
    e: MouseEvent<HTMLElement>,
    resourceId: number,
    featureId: number
  ) => {
    e.stopPropagation();
    display.identify.identifyFeatureByAttrValue(resourceId, "id", featureId);
  };

  const groupIcon = (type: SearchResultGroup["type"]) => {
    if (type === "place") return <LocationOnIcon />;
    if (type === "layers") return <LayersIcon />;
    return <PublicIcon />;
  };

  const groupKey = (group: SearchResultGroup) =>
    group.type === "layers" ? `layers-${group.styleId}` : group.type;

  const makeResultNode = (
    group: SearchResultGroup,
    resultInfo: SearchResult
  ): ResultTreeNode => {
    const identify =
      group.type === "layers" &&
      group.identifiable &&
      group.resourceId !== undefined &&
      resultInfo.featureId !== undefined
        ? { resourceId: group.resourceId, featureId: resultInfo.featureId }
        : undefined;

    return {
      key: resultInfo.key,
      isLeaf: true,
      result: resultInfo,
      title: (
        <Row className="tree-item-row" wrap={false} gutter={6}>
          <Col className="tree-item-title tree-item-title-grow">
            {resultInfo.label}
          </Col>
          {identify && (
            <Col
              className="tree-item-action"
              title={gettext("Identify object")}
              onClick={(e) =>
                onIdentifyIconClick(e, identify.resourceId, identify.featureId)
              }
            >
              <IdentifyIcon />
            </Col>
          )}
        </Row>
      ),
    };
  };

  const makeGroupNode = (group: SearchResultGroup): ResultTreeNode => ({
    key: groupKey(group),
    selectable: false,
    title: (
      <Row className="tree-item-row" wrap={false} gutter={6}>
        <Col className="tree-item-title">{group.label}</Col>
        <Col className="tree-item-title-icon">{groupIcon(group.type)}</Col>
      </Row>
    ),
    children: group.children.map((r) => makeResultNode(group, r)),
  });

  const groupKeys = groups.map((g) => groupKey(g));
  const expandedKeys = groupKeys.filter((k) => !collapsedGroups.has(k));
  const selectedKeys = resultSelected ? [resultSelected.key] : [];

  const onTreeExpand = (expandedKeysValue: Key[]) => {
    const expandedSet = new Set(expandedKeysValue.map(String));
    const next = new Set(collapsedGroups);
    for (const key of groupKeys) {
      if (expandedSet.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
    }
    onCollapsedGroupsChange(next);
  };

  return (
    <Tree
      className="ngw-webmap-search-tree"
      blockNode
      virtual={false}
      showIcon={false}
      expandAction="click"
      treeData={groups.map((g) => makeGroupNode(g))}
      expandedKeys={expandedKeys}
      selectedKeys={selectedKeys}
      onExpand={onTreeExpand}
      onSelect={(_selectedKeys, selectInfo) => {
        if (selectInfo.node.result) {
          selectResult(selectInfo.node.result);
        }
      }}
    />
  );
}

SearchResultsTree.displayName = "SearchResultsTree";
