import { Form } from "@nextgisweb/gui/antd";

export { FieldsForm } from "./FieldsForm";

export * from "./type";

// Reexport shortcut
const useForm = Form.useForm;
export { useForm, Form };
