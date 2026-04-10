import { collection, getDocs, updateDoc } from "firebase/firestore";
import { auth, firestore } from "../firebase/firebaseConfig";
import { createNotification } from "./notificationService";

export const checkExpiryAlerts = async () => {
  const user = auth.currentUser;
  if (!user) return;

  const snap = await getDocs(
    collection(firestore, "users", user.uid, "cards")
  );

  const today = new Date();

  for (const d of snap.docs) {
    const card = d.data();

    if (!card.expiry || card.expiry === "N/A") continue;
    if (card.lastNotified) continue;

    const [month, year] = card.expiry.split("/");
    const expiryDate = new Date(Number(year), Number(month) - 1);

    const daysLeft =
      (expiryDate.getTime() - today.getTime()) / (1000 * 3600 * 24);

    if (daysLeft > 0 && daysLeft <= 30) {
      // 🔔 Bell notification ONLY
      await createNotification(
        "Points Expiring Soon",
        `${card.cardName} points expire in ${Math.ceil(daysLeft)} days.`,
        "expiry"
      );

      // Prevent duplicate notifications
      await updateDoc(d.ref, {
        lastNotified: true,
      });
    }
  }
};
