import { auth, firestore } from "../firebase/firebaseConfig";
import { doc, setDoc } from "firebase/firestore";
import { showUINotification } from "./uiNotification";

export const createNotification = async (
  title: string,
  message: string,
  type: "card" | "expiry" | "security"
) => {
  const user = auth.currentUser;
  if (!user) return;

  const id = Date.now().toString();

  // Save notification to Firestore
  await setDoc(
    doc(firestore, "users", user.uid, "notifications", id),
    {
      id,
      title,
      message,
      type,
      read: false,
      createdAt: Date.now(),
    }
  );

  // Show UI notification + vibration
  showUINotification(title, message);
};
