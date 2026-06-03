import { connectFunctionsEmulator, getFunctions } from "firebase/functions";
import { app } from "./FirebaseConfig";
import { getFunctionsEmulatorHost, getFunctionsRegion } from "./env";

let functionsInstance: ReturnType<typeof getFunctions> | null = null;
let emulatorConnected = false;

export const getFirebaseFunctions = () => {
  if (!app) {
    throw new Error("Firebase uygulaması başlatılamadı");
  }

  if (!functionsInstance) {
    functionsInstance = getFunctions(app, getFunctionsRegion());

    const emulatorHost = getFunctionsEmulatorHost();
    if (emulatorHost && !emulatorConnected) {
      const [host, portStr] = emulatorHost.split(":");
      const port = Number(portStr) || 5001;
      connectFunctionsEmulator(functionsInstance, host, port);
      emulatorConnected = true;
    }
  }

  return functionsInstance;
};
