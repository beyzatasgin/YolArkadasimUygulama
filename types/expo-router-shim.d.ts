import "expo-router";

declare module "expo-router" {
  export type Href = string | { pathname: string; params?: Record<string, string> };
}
