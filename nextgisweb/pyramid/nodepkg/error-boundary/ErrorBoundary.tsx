import { Component } from "react";

import { extractError } from "@nextgisweb/gui/error/extractError";
import type { ErrorInfo } from "@nextgisweb/gui/error/extractError";

import ErrorPage from "../error-page";

type State = {
    hasError: boolean;
    errorJson?: ErrorInfo;
};

type Props = {
    children: React.ReactNode;
    fallback?: (error: ErrorInfo) => React.ReactNode;
};

export class ErrorBoundary extends Component<Props, State> {
    state: State = { hasError: false };

    static getDerivedStateFromError(error: unknown): Partial<State> {
        return {
            hasError: true,
            errorJson: extractError(error),
        };
    }

    componentDidCatch(error: unknown) {
        if (window.ngwSentry && error instanceof Error) {
            window.ngwSentry.captureException(error);
        }
    }

    render() {
        if (this.state.hasError && this.state.errorJson) {
            return this.props.fallback ? (
                this.props.fallback(this.state.errorJson)
            ) : (
                <ErrorPage error_json={this.state.errorJson} />
            );
        }
        return this.props.children;
    }
}
