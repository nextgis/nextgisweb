export interface ApiErrorResponse extends Response {
    data: string;
}

export interface ApiError {
    name?: string;
    message: string;
    title: string;
    detail?: string | null;
    data?: string | { data: string } | null;
    response?: ApiErrorResponse;
}
