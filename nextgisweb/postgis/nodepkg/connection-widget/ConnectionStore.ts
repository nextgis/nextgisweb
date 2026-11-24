import { action, computed, observableRef } from "mobx";

import { mapper, validate } from "@nextgisweb/gui/arm";
import type { PostgisConnectionRead } from "@nextgisweb/postgis/type/api";
import type { EditorStore } from "@nextgisweb/resource/type";

type ConnectionValue = Required<
  Omit<PostgisConnectionRead, "where_allowlist">
> & {
  where_functions: string[];
  where_operators: string[];
};

const {
  hostname,
  port,
  sslmode,
  username,
  password,
  database,
  user_context,
  where_functions: whereFunctions,
  where_operators: whereOperators,
  $load: load,
  $error: error,
  $dirty: dirty,
} = mapper<ConnectionStore, ConnectionValue>({
  validateIf: (o) => o.validate,
});

hostname.validate(validate.string({ minLength: 1 }));
username.validate(validate.string({ minLength: 1 }));
password.validate(validate.string({ minLength: 1 }));
database.validate(validate.string({ minLength: 1 }));

export class ConnectionStore implements EditorStore<PostgisConnectionRead> {
  readonly identity = "postgis_connection";

  readonly hostname = hostname.init("", this);
  readonly port = port.init(null, this);
  readonly sslmode = sslmode.init(null, this);
  readonly username = username.init("", this);
  readonly password = password.init("", this);
  readonly database = database.init("", this);
  readonly user_context = user_context.init(false, this);
  readonly whereFunctions = whereFunctions.init([], this);
  readonly whereOperators = whereOperators.init([], this);

  @observableRef accessor validate = false;

  @action
  load(value: PostgisConnectionRead) {
    const { where_allowlist: allowlist, ...rest } = value;
    load(this, {
      ...rest,
      where_functions: allowlist?.functions ?? [],
      where_operators: allowlist?.operators ?? [],
    });
  }

  dump(): PostgisConnectionRead | undefined {
    if (!this.dirty) return undefined;
    return {
      ...this.hostname.jsonPart(),
      ...this.port.jsonPart(),
      ...this.sslmode.jsonPart(),
      ...this.username.jsonPart(),
      ...this.password.jsonPart(),
      ...this.database.jsonPart(),
      ...this.user_context.jsonPart(),
      where_allowlist: {
        functions: this.whereFunctions.value,
        operators: this.whereOperators.value,
      },
    };
  }

  @computed
  get dirty(): boolean {
    return dirty(this);
  }

  @computed
  get isValid(): boolean {
    return error(this) === false;
  }
}
