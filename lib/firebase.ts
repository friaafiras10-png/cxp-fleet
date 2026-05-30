import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDdrt2sGx_T4w0_jAGehE7d1l2_3ZTXTyY",
  authDomain: "ccxp-70b64.firebaseapp.com",
  projectId: "ccxp-70b64",
  storageBucket: "ccxp-70b64.firebasestorage.app",
  messagingSenderId: "551928167507",
  appId: "1:551928167507:web:cbd1d2eee9451fa8979aa6",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);