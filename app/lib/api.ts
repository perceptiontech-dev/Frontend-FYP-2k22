const DEFAULT_API_BASE_URL =
  "https://backend-fyp-2k22-924f6a04.fastapicloud.dev";

const configuredApiBaseUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
const isLocalApiBaseUrl = configuredApiBaseUrl
  ? /^(https?:\/\/)(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(
      configuredApiBaseUrl
    )
  : false;

export const API_BASE_URL = (
  !configuredApiBaseUrl || isLocalApiBaseUrl
    ? DEFAULT_API_BASE_URL
    : configuredApiBaseUrl
).replace(/\/+$/, "");