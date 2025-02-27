import { route } from "@nextgisweb/pyramid/api";

const data = await route("resource.blueprint").get({ cache: true });

export const { resources, scopes, categories } = data;
