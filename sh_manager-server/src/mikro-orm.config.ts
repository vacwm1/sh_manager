import { Room } from "./entities/Room";
import { __prod__ } from "./constants";
import { MikroORM } from "@mikro-orm/core";
import path from "path";

export default {
    migrations: {
        path: path.join(__dirname, './migrations'),
        pattern: /^[\w-]+\d+\.[tj]s$/,
    },
    entities: [Room],
    dbName: 'sh_manager',
    password: 'codelyoco221103',
    type: 'postgresql',
    debug: !__prod__
} as Parameters<typeof MikroORM.init>[0];