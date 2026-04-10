import { firestore } from "../firebase/firebaseConfig";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export type HistoryType = "add" | "redeem" | "initial";

export const logHistory = async (
    userId: string,
    cardName: string,
    type: HistoryType,
    points: number
) => {
    if (!userId) return;

    try {
        await addDoc(collection(firestore, "users", userId, "history"), {
            cardName,
            type,
            points,
            createdAt: serverTimestamp(),
        });
    } catch (error) {
        console.error("Failed to log history:", error);
    }
};
