export const FIREBASE_AUTH_INIT_ERROR_TITLE = "Kimlik Doğrulama Hatası";
export const FIREBASE_AUTH_INIT_DEFAULT_MESSAGE =
  "Firebase kimlik doğrulama servisi başlatılamadı.";

export const getFirebaseAuthInitErrorMessage = (firebaseInitError) =>
  firebaseInitError?.message || FIREBASE_AUTH_INIT_DEFAULT_MESSAGE;
