export const nodeEnv =
  (typeof process !== "undefined" ? process.env.NODE_ENV : undefined) ??
  import.meta.env.MODE ??
  "development";

export const isDevelopment = nodeEnv !== "production";
