// CCRO/app/NotificationsScreen.tsx
import React from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    SafeAreaView,
    Animated,
    Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useNotifications, NotificationItem } from "../context/NotificationContext";
import { Swipeable } from "react-native-gesture-handler";

const DARK_BG = "#000";
const GOLD = "#a87c5f";

export default function NotificationsScreen() {
    const router = useRouter();
    const { notifications, markAsRead, deleteNotification, clearAllNotifications } = useNotifications();

    const handleClearAll = () => {
        if (notifications.length === 0) return;
        Alert.alert("Clear All", "Are you sure you want to delete all notifications?", [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", style: "destructive", onPress: clearAllNotifications }
        ]);
    };

    const renderRightActions = (id: string, progress: any, dragX: any) => {
        const scale = dragX.interpolate({
            inputRange: [-80, 0],
            outputRange: [1, 0],
            extrapolate: 'clamp',
        });

        return (
            <TouchableOpacity style={styles.deleteAction} onPress={() => deleteNotification(id)}>
                <Animated.View style={{ transform: [{ scale }] }}>
                    <Ionicons name="trash-outline" size={24} color="#fff" />
                </Animated.View>
            </TouchableOpacity>
        );
    };

    const renderItem = ({ item }: { item: NotificationItem }) => {
        let iconName: any = "notifications";
        let iconColor = GOLD;

        if (item.type === "success") {
            iconName = "checkmark-circle";
            iconColor = "#4caf50";
        } else if (item.type === "warning") {
            iconName = "warning";
            iconColor = "#ff9800";
        } else if (item.type === "error") {
            iconName = "alert-circle";
            iconColor = "#f44336";
        } else if (item.type === "info") {
            iconName = "information-circle";
            iconColor = "#2196f3";
        }

        return (
            <Swipeable
                renderRightActions={(progress, dragX) => renderRightActions(item.id, progress, dragX)}
            >
                <TouchableOpacity
                    style={[styles.itemRef, !item.read && styles.unreadItem]}
                    onPress={() => markAsRead(item.id)}
                    activeOpacity={0.7}
                >
                    <View style={styles.iconContainer}>
                        <Ionicons name={iconName} size={28} color={iconColor} />
                    </View>
                    <View style={styles.textContainer}>
                        <Text style={styles.title}>{item.title}</Text>
                        <Text style={styles.message}>{item.message}</Text>
                        <Text style={styles.time}>
                            {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleString() : "Just now"}
                        </Text>
                    </View>
                    {!item.read && <View style={styles.dot} />}
                </TouchableOpacity>
            </Swipeable>
        );
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={GOLD} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Notifications</Text>
                {notifications.length > 0 && (
                    <TouchableOpacity onPress={handleClearAll}>
                        <Text style={styles.markAllText}>Clear All</Text>
                    </TouchableOpacity>
                )}
            </View>

            <FlatList
                data={notifications}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="notifications-off-outline" size={64} color="#333" />
                        <Text style={styles.emptyText}>No notifications yet.</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: DARK_BG,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: "#222",
    },
    backBtn: {
        padding: 5,
    },
    headerTitle: {
        color: GOLD,
        fontSize: 20,
        fontWeight: "700",
    },
    markAllText: {
        color: "#f44336",
        fontSize: 14,
        fontWeight: "600",
    },
    listContent: {
        padding: 20,
        paddingBottom: 40,
    },
    emptyContainer: {
        alignItems: "center",
        marginTop: 100,
    },
    emptyText: {
        color: "#555",
        marginTop: 20,
        fontSize: 16,
    },
    itemRef: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#111",
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
    },
    unreadItem: {
        backgroundColor: "#1f1f1f",
        borderLeftWidth: 3,
        borderLeftColor: GOLD,
    },
    iconContainer: {
        marginRight: 16,
    },
    textContainer: {
        flex: 1,
    },
    title: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "700",
        marginBottom: 4,
    },
    message: {
        color: "#ccc",
        fontSize: 14,
        lineHeight: 20,
    },
    time: {
        color: "#666",
        fontSize: 12,
        marginTop: 6,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: GOLD,
        marginLeft: 10,
    },
    deleteAction: {
        backgroundColor: '#f44336',
        justifyContent: 'center',
        alignItems: 'center',
        width: 80,
        height: '80%', // adjust to fit item height
        borderRadius: 12,
        marginBottom: 12,
        marginLeft: 10,
        marginTop: 5,
    }
});
