import { sortBy } from "lodash-es";
import { useMemo, useRef, useState } from "react";

import { Button, Flex, InputValue, Modal, Select } from "@nextgisweb/gui/antd";
import type { InputRef, ModalProps } from "@nextgisweb/gui/antd";
import { useThemeVariables } from "@nextgisweb/gui/hook";
import { useContainerWidth } from "@nextgisweb/gui/hook/useContainerWidth";
import { routeURL } from "@nextgisweb/pyramid/api";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type {
  BlueprintCategory,
  ResourceCategoryIdentity,
  ResourceCls,
} from "@nextgisweb/resource/type/api";

import { categories, resources } from "../../blueprint";
import { ResourceIcon } from "../../icon";

import "./CreateResourceModal.less";

const msgCreateResource = gettext("Create resource");
const msgSearchPlaceholder = gettext("Search");

// FIXME: A better way exists to handle this!
const ALL_RESOURCES = "" as ResourceCategoryIdentity;

interface CreateResourceModalProps extends Omit<
  ModalProps,
  "footer" | "classNames"
> {
  resourceId: number;
  creatable: ResourceCls[];
}

export default function CreateResourceModal({
  resourceId,
  creatable,
  style,
  open,
  ...props
}: CreateResourceModalProps) {
  const [curCatIdentity, setCurCatIdentity] = useState(ALL_RESOURCES);
  const [search, setSearch] = useState("");

  const searchRef = useRef<InputRef>(null);
  const [content, setContent] = useState<HTMLElement | null>(null);
  const compact = useContainerWidth(content) < 660;

  const [resData, catData] = useMemo(() => {
    const outCat: Record<string, BlueprintCategory> = {
      [ALL_RESOURCES]: {
        identity: ALL_RESOURCES,
        order: -100,
        label: gettext("Everything"),
      },
    };
    const outRes = creatable.map((identity) => {
      const resBp = resources[identity]!;
      outCat[resBp.category] = categories[resBp.category];
      return {
        key: identity,
        label: resBp.label,
        category: resBp.category,
        order: resBp.order,
        url: routeURL("resource.create", resourceId) + `?cls=${identity}`,
        icon: <ResourceIcon identity={identity} />,
      };
    });
    return [
      sortBy(
        outRes,
        (i) => i.order,
        (i) => i.label
      ),
      sortBy(Object.values(outCat), (i) => i.order),
    ];
  }, [creatable, resourceId]);

  const resSelCat = useMemo(() => {
    const searchLowerCase = search.toLocaleLowerCase();
    return resData.filter(
      (i) =>
        (curCatIdentity === ALL_RESOURCES || i.category === curCatIdentity) &&
        (i.key.includes(searchLowerCase) ||
          i.label.toLowerCase().includes(searchLowerCase))
    );
  }, [curCatIdentity, resData, search]);

  const themeVariables = useThemeVariables({
    "border-radius-lg": "borderRadiusLG",
    "color-primary": "colorPrimary",
    "color-primary-bg": "colorPrimaryBg",
  });

  const searchInput = (
    <InputValue
      ref={searchRef}
      value={search}
      onChange={setSearch}
      placeholder={msgSearchPlaceholder}
      type="search"
      allowClear
      style={compact ? { flex: "1 1 10rem", minWidth: 0 } : undefined}
    />
  );

  return (
    <Modal
      fullscreenOnMobile
      classNames={{ container: "ngw-resource-create-resource-modal" }}
      style={{ ...themeVariables, ...(style ? style : {}) }}
      title={
        <>
          <div className="title">{msgCreateResource}</div>
          {!compact && <div className="search">{searchInput}</div>}
        </>
      }
      afterOpenChange={(open) => {
        if (open && searchRef.current) {
          searchRef.current.focus();
        }
      }}
      footer={null}
      width={960}
      open={open}
      centered
      {...props}
    >
      <Flex
        ref={setContent}
        className="picker-content"
        gap="1rem"
        vertical={compact}
      >
        {compact ? (
          <Flex gap="small" wrap>
            <Select
              aria-label={gettext("Category")}
              value={curCatIdentity}
              options={catData.map(({ identity, label }) => ({
                value: identity,
                label,
              }))}
              onChange={setCurCatIdentity}
              style={{ flex: "1 1 10rem", minWidth: 0 }}
            />
            {searchInput}
          </Flex>
        ) : (
          <div className="categories">
            {catData.map((i) => (
              <div
                key={i.identity}
                className={
                  i.identity === curCatIdentity ? "selected" : undefined
                }
                onClick={() => setCurCatIdentity(i.identity)}
              >
                {i.label}
              </div>
            ))}
          </div>
        )}
        <div
          className="resources"
          style={compact ? { paddingInlineEnd: 0 } : undefined}
        >
          <div
            className="grid"
            style={
              compact
                ? {
                    gridTemplateColumns:
                      "repeat(auto-fill, minmax(min(100%, 11rem), 1fr))",
                  }
                : undefined
            }
          >
            {resSelCat.map((i) => (
              <Button key={i.key} href={i.url} icon={i.icon} size="large">
                {i.label}
              </Button>
            ))}
          </div>
        </div>
      </Flex>
    </Modal>
  );
}
