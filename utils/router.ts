import type { Router } from "expo-router";

/** Expo typed routes ile uyumlu güvenli yönlendirme */
export function appPush(router: Router, href: string): void {
  router.push(href as never);
}

export function appReplace(router: Router, href: string): void {
  router.replace(href as never);
}
