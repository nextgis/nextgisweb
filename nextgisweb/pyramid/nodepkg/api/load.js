/** @entrypoint */
import { request } from './request';

export function load(path, require, load) {
    request(path).then(load);
}
