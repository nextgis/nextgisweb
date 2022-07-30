import { KeynameTextBox } from "./field/KeynameTextBox";
import { LanguageSelect } from "./field/LanguageSelect";
import { ResourceSelect } from "./field/ResourceSelect";
import { Select } from "./field/Select";
import { ValidationTextBox } from "./field/ValidationTextBox";
import { FieldsForm } from "./FieldsForm";

import { Form } from "@nextgisweb/gui/antd";

// Reexport shortcut
const useForm = Form.useForm;

export {
    ValidationTextBox,
    KeynameTextBox,
    LanguageSelect,
    ResourceSelect,
    FieldsForm,
    Select,
    useForm,
};
