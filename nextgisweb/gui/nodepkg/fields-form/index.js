import { KeynameTextBox } from "./field/KeynameTextBox";
import { LanguageSelect } from "./field/LanguageSelect";
import { ResourceSelect } from "./field/ResourceSelect";
import { TextArea } from "./field/TextArea";
import { Password } from "./field/Password";
import { Checkbox } from "./field/Checkbox";
import { Select } from "./field/Select";
import { Number } from "./field/Number";
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
    Password,
    TextArea,
    Checkbox,
    Select,
    Number,
    Form,
    useForm,
};
