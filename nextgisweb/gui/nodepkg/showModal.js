import ReactDOM from "react-dom";

// Based on https://github.com/ant-design/ant-design/blob/master/components/modal/confirm.tsx
export default function showModal(ModalComponent, config) {
    const container = document.createDocumentFragment();
    let currentConfig = { ...config, close, visible: true };

    const render = ({ ...props }) => {
        setTimeout(() => {
            ReactDOM.render(
                <ModalComponent {...props}></ModalComponent>,
                container
            );
        });
    };

    function destroy() {
        ReactDOM.unmountComponentAtNode(container);
    }

    function close() {
        currentConfig = {
            ...currentConfig,
            visible: false,
            afterClose: () => {
                if (typeof config.afterClose === "function") {
                    config.afterClose();
                }

                destroy.apply(this);
            },
        };
        render(currentConfig);
    }

    function update(configUpdate) {
        if (typeof configUpdate === 'function') {
          currentConfig = configUpdate(currentConfig);
        } else {
          currentConfig = {
            ...currentConfig,
            ...configUpdate,
          };
        }
        render(currentConfig);
      }

    render(currentConfig);

    return {
        destroy: close, update
    };
}
