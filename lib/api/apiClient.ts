export type ApiMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type ApiPrimitive = string | number | boolean | null;

export type ApiQueryValue = ApiPrimitive | ApiPrimitive[];

export type ApiQueryParams = Record<string, ApiQueryValue | undefined>;

export type ApiHeaders = Record<string, string>;

export type ApiRequestOptions = Omit<
  RequestInit,
  "body" | "method" | "headers"
> & {
  method?: ApiMethod;
  body?: BodyInit | object | null;
  headers?: ApiHeaders;
  query?: ApiQueryParams;
  token?: string | null;
};

export type LaravelValidationErrors = Record<string, string[]>;

export class ApiError extends Error {
  status: number;
  data: unknown;
  errors?: LaravelValidationErrors;

  constructor(
    message: string,
    status: number,
    data: unknown,
    errors?: LaravelValidationErrors,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
    this.errors = errors;
  }
}

const DEFAULT_BASE_URL = "http://192.168.1.41:8000/api";

let authToken: string | null = null;

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/, "");
}

function normalizePath(path: string) {
  return path.startsWith("/") ? path : `/${path}`;
}

function buildQueryString(query?: ApiQueryParams) {
  if (!query) {
    return "";
  }

  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        params.append(key, String(item));
      }
      continue;
    }

    params.append(key, String(value));
  }

  const queryString = params.toString();
  return queryString ? `?${queryString}` : "";
}

function isFormData(body: ApiRequestOptions["body"]): body is FormData {
  return typeof FormData !== "undefined" && body instanceof FormData;
}

function isJsonBody(body: ApiRequestOptions["body"]) {
  return (
    body !== null &&
    body !== undefined &&
    !isFormData(body) &&
    typeof body === "object"
  );
}

async function parseResponse(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  if (contentType.includes("text/")) {
    return response.text();
  }

  return null;
}

function getErrorMessage(data: unknown, fallback: string) {
  if (typeof data === "string" && data.trim()) {
    return data;
  }

  if (data && typeof data === "object" && "message" in data) {
    const message = (data as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  return fallback;
}

function getValidationErrors(data: unknown) {
  if (!data || typeof data !== "object" || !("errors" in data)) {
    return undefined;
  }

  const errors = (data as { errors?: unknown }).errors;
  return errors && typeof errors === "object"
    ? (errors as LaravelValidationErrors)
    : undefined;
}

export function setApiToken(token: string | null) {
  authToken = token;
}

export function getApiToken() {
  return authToken;
}

export function clearApiToken() {
  authToken = null;
}

export function createApiClient(baseUrl = DEFAULT_BASE_URL) {
  const resolvedBaseUrl = normalizeBaseUrl(baseUrl);

  async function request<TResponse>(
    path: string,
    options: ApiRequestOptions = {},
  ) {
    if (!resolvedBaseUrl) {
      throw new Error("Missing API base URL. Set EXPO_PUBLIC_API_URL.");
    }

    const {
      method = "GET",
      body,
      headers,
      query,
      token = authToken,
      ...fetchOptions
    } = options;

    const requestHeaders: ApiHeaders = {
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
      ...headers,
    };

    let requestBody: BodyInit | undefined;

    if (isJsonBody(body)) {
      requestHeaders["Content-Type"] = "application/json";
      requestBody = JSON.stringify(body);
    } else if (body !== null && body !== undefined) {
      requestBody = body as BodyInit;
    }

    if (token) {
      requestHeaders.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(
      `${resolvedBaseUrl}${normalizePath(path)}${buildQueryString(query)}`,
      {
        ...fetchOptions,
        method,
        headers: requestHeaders,
        body: requestBody,
      },
    );

    const data = await parseResponse(response);

    if (!response.ok) {
      throw new ApiError(
        getErrorMessage(data, `Request failed with status ${response.status}`),
        response.status,
        data,
        getValidationErrors(data),
      );
    }

    return data as TResponse;
  }

  return {
    request,
    get<TResponse>(
      path: string,
      options?: Omit<ApiRequestOptions, "method" | "body">,
    ) {
      return request<TResponse>(path, { ...options, method: "GET" });
    },
    post<TResponse>(
      path: string,
      body?: ApiRequestOptions["body"],
      options?: Omit<ApiRequestOptions, "method" | "body">,
    ) {
      return request<TResponse>(path, { ...options, method: "POST", body });
    },
    put<TResponse>(
      path: string,
      body?: ApiRequestOptions["body"],
      options?: Omit<ApiRequestOptions, "method" | "body">,
    ) {
      return request<TResponse>(path, { ...options, method: "PUT", body });
    },
    patch<TResponse>(
      path: string,
      body?: ApiRequestOptions["body"],
      options?: Omit<ApiRequestOptions, "method" | "body">,
    ) {
      return request<TResponse>(path, { ...options, method: "PATCH", body });
    },
    delete<TResponse>(
      path: string,
      options?: Omit<ApiRequestOptions, "method" | "body">,
    ) {
      return request<TResponse>(path, { ...options, method: "DELETE" });
    },
  };
}

export const apiClient = createApiClient();
