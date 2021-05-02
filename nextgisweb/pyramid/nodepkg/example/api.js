/** @entrypoint */
import { request, route } from '@nextgisweb/pyramid/api';
import ErrorDialog from 'ngw-pyramid/ErrorDialog/ErrorDialog';

export default async () => {
    let data;
    try {
        data = await request('/api/some');
    } catch (e) {
        new ErrorDialog(e).show();
    }
    return JSON.stringify(data);
}
