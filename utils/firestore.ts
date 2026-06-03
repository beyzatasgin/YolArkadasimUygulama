import type { Firestore } from "firebase/firestore";

export function requireDb(db: Firestore | null): Firestore {
  if (!db) {
    throw new Error("Firestore başlatılamadı");
  }
  return db;
}
