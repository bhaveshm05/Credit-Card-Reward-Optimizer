// NotificationContext.tsx
import React, {
    createContext,
    useContext,
    useEffect,
    useState,
    ReactNode,
} from "react";
import { auth, firestore } from "../firebase/firebaseConfig";
import {
    collection,
    addDoc,
    query,
    orderBy,
    onSnapshot,
    serverTimestamp,
    updateDoc,
    doc,
    where,
    limit,
    getDocs,
    deleteDoc,
} from "firebase/firestore";

export type NotificationType =
    | "info"
    | "warning"
    | "success"
    | "error"
    | "expiry";

export interface NotificationItem {
    id: string;
    title: string;
    message: string;
    type: NotificationType;
    read: boolean;
    createdAt: any;
}

interface NotificationContextType {
    notifications: NotificationItem[];
    unreadCount: number;
    addNotification: (
        title: string,
        message: string,
        type: NotificationType
    ) => Promise<void>;
    markAsRead: (id: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    deleteNotification: (id: string) => Promise<void>;
    clearAllNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
    undefined
);

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error(
            "useNotifications must be used within a NotificationProvider"
        );
    }
    return context;
};

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [user, setUser] = useState(auth.currentUser);

    // Track Auth State changes
    useEffect(() => {
        const unsubscribeAuth = auth.onAuthStateChanged((u) => {
            setUser(u);
        });
        return unsubscribeAuth;
    }, []);

    // Listen to notifications
    useEffect(() => {
        if (!user) {
            setNotifications([]);
            setUnreadCount(0);
            return;
        }

        const q = query(
            collection(firestore, "users", user.uid, "notifications"),
            orderBy("createdAt", "desc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const items = snapshot.docs.map((d) => ({
                id: d.id,
                ...d.data(),
            })) as NotificationItem[];

            setNotifications(items);
            setUnreadCount(items.filter((i) => !i.read).length);
        }, (error) => {
            console.error("Notification listener ERROR:", error);
        });

        return () => unsubscribe();
    }, [user]);

    const addNotification = async (
        title: string,
        message: string,
        type: NotificationType
    ) => {
        if (!user) return;

        try {
            await addDoc(collection(firestore, "users", user.uid, "notifications"), {
                title,
                message,
                type,
                read: false,
                createdAt: serverTimestamp(),
            });
        } catch (err) {
            console.error("Failed to add notification", err);
        }
    };

    const markAsRead = async (id: string) => {
        if (!user) return;
        try {
            const ref = doc(firestore, "users", user.uid, "notifications", id);
            await updateDoc(ref, { read: true });
        } catch (err) {
            console.error("Failed to mark read", err);
        }
    };

    const markAllAsRead = async () => {
        if (!user) return;
        try {
            const batchPromises = notifications
                .filter((n) => !n.read)
                .map((n) =>
                    updateDoc(
                        doc(firestore, "users", user.uid, "notifications", n.id),
                        { read: true }
                    )
                );
            await Promise.all(batchPromises);
        } catch (err) {
            console.error("Failed to mark all read", err);
        }
    };

    const deleteNotification = async (id: string) => {
        if (!user) return;
        try {
            await deleteDoc(doc(firestore, "users", user.uid, "notifications", id));
        } catch (err) {
            console.error("Failed to delete notification", err);
        }
    };

    const clearAllNotifications = async () => {
        if (!user) return;
        try {
            const batchPromises = notifications.map((n) =>
                deleteDoc(doc(firestore, "users", user.uid, "notifications", n.id))
            );
            await Promise.all(batchPromises);
        } catch (err) {
            console.error("Failed to clear notifications", err);
        }
    };

    return (
        <NotificationContext.Provider
            value={{
                notifications,
                unreadCount,
                addNotification,
                markAsRead,
                markAllAsRead,
                deleteNotification,
                clearAllNotifications,
            }}
        >
            {children}
        </NotificationContext.Provider>
    );
};
