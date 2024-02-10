import {
    Affix,
    Alert,
    Anchor,
    AutoComplete,
    Avatar,
    BackTop,
    Badge,
    Breadcrumb,
    Button,
    Card,
    Carousel,
    Cascader,
    Checkbox,
    Col,
    Collapse,
    ColorPicker,
    Descriptions,
    Divider,
    Drawer,
    Dropdown,
    Empty,
    FloatButton,
    Form,
    Grid,
    Image,
    Input,
    InputNumber,
    Layout,
    List,
    Mentions,
    Menu,
    Modal,
    Pagination,
    Popconfirm,
    Popover,
    Progress,
    Radio,
    Rate,
    Result,
    Row,
    Select,
    Skeleton,
    Slider,
    Space,
    Spin,
    Statistic,
    Steps,
    Switch,
    Tag,
    Timeline,
    Tooltip,
    Transfer,
    Tree,
    TreeSelect,
    Typography,
    Upload,
    message,
    notification,
} from "antd";

import type { ParamsOf } from "../type";

export { default as Calendar } from "./calendar";
export { default as ConfigProvider } from "./config-provider";
export { default as DatePicker } from "./date-picker";
export { default as TimePicker } from "./time-picker";
export { default as RangePicker } from "./range-date-time-picker";
export { default as Table } from "./table";
export { default as Tabs } from "./tabs";

export type { SizeType } from "antd/lib/config-provider/SizeContext";
export type { TableProps } from "./table";
export type { TabsProps } from "./tabs";

export {
    Affix,
    Anchor,
    AutoComplete,
    Alert,
    Avatar,
    BackTop,
    Badge,
    Breadcrumb,
    Button,
    Card,
    Collapse,
    Carousel,
    Cascader,
    Checkbox,
    Col,
    ColorPicker,
    Descriptions,
    Divider,
    Dropdown,
    Drawer,
    Empty,
    FloatButton,
    Form,
    Grid,
    Input,
    Image,
    InputNumber,
    Layout,
    List,
    message,
    Menu,
    Mentions,
    Modal,
    Statistic,
    notification,
    Pagination,
    Popconfirm,
    Popover,
    Progress,
    Radio,
    Rate,
    Result,
    Row,
    Select,
    Skeleton,
    Slider,
    Space,
    Spin,
    Steps,
    Switch,
    Transfer,
    Tree,
    TreeSelect,
    Tag,
    Timeline,
    Tooltip,
    Typography,
    Upload,
};

// Props shortcuts
type AnchorProps = ParamsOf<typeof Anchor>;
type AutoCompleteProps = ParamsOf<typeof AutoComplete>;
type AlertProps = ParamsOf<typeof Alert>;
type AvatarProps = ParamsOf<typeof Avatar>;
type BackTopProps = ParamsOf<typeof BackTop>;
type BadgeProps = ParamsOf<typeof Badge>;
type BreadcrumbProps = ParamsOf<typeof Breadcrumb>;
type ButtonProps = ParamsOf<typeof Button>;
type CardProps = ParamsOf<typeof Card>;
type CollapseProps = ParamsOf<typeof Collapse>;
type CarouselProps = ParamsOf<typeof Carousel>;
type CascaderProps = ParamsOf<typeof Cascader>;
type CheckboxProps = ParamsOf<typeof Checkbox>;
type ColProps = ParamsOf<typeof Col>;
type ColorPickerProps = ParamsOf<typeof ColorPicker>;
type DescriptionsProps = ParamsOf<typeof Descriptions>;
type DividerProps = ParamsOf<typeof Divider>;
type DropdownProps = ParamsOf<typeof Dropdown>;
type DrawerProps = ParamsOf<typeof Drawer>;
type EmptyProps = ParamsOf<typeof Empty>;
type FloatButtonProps = ParamsOf<typeof FloatButton>;
type FormProps = ParamsOf<typeof Form>;
type InputProps = ParamsOf<typeof Input>;
type ImageProps = ParamsOf<typeof Image>;
type InputNumberProps = ParamsOf<typeof InputNumber>;
type LayoutProps = ParamsOf<typeof Layout>;
type ListProps = ParamsOf<typeof List>;
type MenuProps = ParamsOf<typeof Menu>;
type MentionsProps = ParamsOf<typeof Mentions>;
type ModalProps = ParamsOf<typeof Modal>;
type StatisticProps = ParamsOf<typeof Statistic>;
type PaginationProps = ParamsOf<typeof Pagination>;
type PopoverProps = ParamsOf<typeof Popover>;
type ProgressProps = ParamsOf<typeof Progress>;
type RadioProps = ParamsOf<typeof Radio>;
type RateProps = ParamsOf<typeof Rate>;
type ResultProps = ParamsOf<typeof Result>;
type RowProps = ParamsOf<typeof Row>;
type SelectProps = ParamsOf<typeof Select>;
type SkeletonProps = ParamsOf<typeof Skeleton>;
type SliderProps = ParamsOf<typeof Slider>;
type SpaceProps = ParamsOf<typeof Space>;
type SpinProps = ParamsOf<typeof Spin>;
type StepsProps = ParamsOf<typeof Steps>;
type SwitchProps = ParamsOf<typeof Switch>;
type TransferProps = ParamsOf<typeof Transfer>;
type TreeProps = ParamsOf<typeof Tree>;
type TreeSelectProps = ParamsOf<typeof TreeSelect>;
type TagProps = ParamsOf<typeof Tag>;
type TimelineProps = ParamsOf<typeof Timeline>;
type TooltipProps = ParamsOf<typeof Tooltip>;
type TypographyProps = ParamsOf<typeof Typography>;
type UploadProps = ParamsOf<typeof Upload>;

export type {
    AnchorProps,
    AutoCompleteProps,
    AlertProps,
    AvatarProps,
    BackTopProps,
    BadgeProps,
    BreadcrumbProps,
    ButtonProps,
    CardProps,
    CollapseProps,
    CarouselProps,
    CascaderProps,
    CheckboxProps,
    ColProps,
    ColorPickerProps,
    DescriptionsProps,
    DividerProps,
    DropdownProps,
    DrawerProps,
    EmptyProps,
    FloatButtonProps,
    FormProps,
    InputProps,
    ImageProps,
    InputNumberProps,
    LayoutProps,
    ListProps,
    MenuProps,
    MentionsProps,
    ModalProps,
    StatisticProps,
    PaginationProps,
    PopoverProps,
    ProgressProps,
    RadioProps,
    RateProps,
    ResultProps,
    RowProps,
    SelectProps,
    SkeletonProps,
    SliderProps,
    SpaceProps,
    SpinProps,
    StepsProps,
    SwitchProps,
    TransferProps,
    TreeProps,
    TreeSelectProps,
    TagProps,
    TimelineProps,
    TooltipProps,
    TypographyProps,
    UploadProps,
};
