/** @plugin jsrealm.testentry call */
export default function (module, el) {
    Promise.resolve(module()).then(
        (result) => {
            el.innerHTML = result;
        },
        (error) => {
            el.innerHTML = error;
        }
    );
}
