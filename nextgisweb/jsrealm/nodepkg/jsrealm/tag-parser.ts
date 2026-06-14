import * as fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

type ParsedEntry = {
  type: string;
  [key: string]: string | undefined;
};

type DoctrineTag = {
  title: string;
  description?: string;
};

const doctrine = require("doctrine") as {
  parse(
    jsdoc: string,
    options: { unwrap: boolean; tags: string[] }
  ): { tags: DoctrineTag[] };
};

const extractRegexp = /\/\*\*.*(?:\*\/$|$(?:\s*\*\s?.*$)*\s*\*\/)/m;

export default function tagParser(fn: string): ParsedEntry | undefined {
  const body = fs.readFileSync(fn, "utf8");
  const match = extractRegexp.exec(body);
  if (match) {
    const jsdoc = match[0];
    const payload = doctrine.parse(jsdoc, {
      unwrap: true,
      tags: ["entrypoint", "testentry", "registry", "plugin"],
    });
    for (const { title: type, description: value } of payload.tags) {
      const result: ParsedEntry = { type };
      if (value) result[type] = value;
      return result;
    }
  }
}
