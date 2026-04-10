// CCRO/app/tabs/AddRewardCardScreen.tsx
import "react-native-gesture-handler";
import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  FlatList,
  Image,
  Modal,
  TextInput,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { rewardRules } from "../../data/rewardRules";
import { getMilestoneLadder } from "../../utils/rewardCalculator";
import { LinearGradient } from "expo-linear-gradient";
import { Swipeable } from "react-native-gesture-handler";

// FIREBASE
import { auth, firestore } from "../../firebase/firebaseConfig";
import {
  collection,
  doc,
  getDocs,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { useNotifications } from "../../context/NotificationContext";
import { logHistory } from "../../utils/historyUtils";

const GOLD = "#a87c5f";
const BG = "#000"; // Standardized to Black
const CARD_BG = "#1a1a1a"; // Standardized Card BG
const MUTED = "#8a8a8a";
 
 // ---------- BANK LOGOS ----------
 const bankLogos: Record<string, any> = {
   "HDFC Bank": require("../../assets/banks/hdfc.png"),
   "ICICI Bank": require("../../assets/banks/icici.png"),
   "Axis Bank": require("../../assets/banks/axis.png"),
   "SBI": require("../../assets/banks/sbi.png"),
   "Kotak Mahindra Bank": require("../../assets/banks/kotak.png"),
   "IndusInd Bank": require("../../assets/banks/indusind.png"),
   "YES Bank": require("../../assets/banks/yes.png"),
   "Yes Bank": require("../../assets/banks/yes.png"),
   "IDFC FIRST Bank": require("../../assets/banks/idfc.png"),
   "Bank of Baroda": require("../../assets/banks/bob.png"),
   "HSBC": require("../../assets/banks/hsbc.png"),
   "American Express": require("../../assets/banks/amex.png"),
   "Standard Chartered": require("../../assets/banks/hdfc.png"), // Placeholder
   "RBL Bank": require("../../assets/banks/hdfc.png"), // Placeholder
   "AU Bank": require("../../assets/banks/hdfc.png") // Placeholder
 };
 
 const fallbackLogo = require("../../assets/banks/hdfc.png");

type CardType = {
  id: string;
  bank: string;
  cardName: string;
  points: number;
  expiry: string;
  suggestions: string[];
  milestones?: string[];
};

export default function AddRewardCardScreen() {
  const router = useRouter();
  const user = auth.currentUser;
  const { addNotification } = useNotifications();

  const [cards, setCards] = useState<CardType[]>([]);
  const [filtered, setFiltered] = useState<CardType[]>([]);
  const [search, setSearch] = useState("");

  const [editVisible, setEditVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [selected, setSelected] = useState<CardType | null>(null);
  const [detailCard, setDetailCard] = useState<CardType | null>(null);
  const [adjustType, setAdjustType] = useState<"add" | "redeem" | null>(null);
  const [adjustValue, setAdjustValue] = useState("");

  const toastOpacity = useRef(new Animated.Value(0)).current;
  const [toastMsg, setToastMsg] = useState("");

  // 🔥 Load cards
  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      (async () => {
        try {
          const snap = await getDocs(
            collection(firestore, "users", user.uid, "cards")
          );

          const list: CardType[] = snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as any),
          }));

          setCards(list);
          setFiltered(list);
        } catch (err) {
          console.warn("Error loading cards:", err);
        }
      })();
    }, [])
  );

  // SEARCH
  useEffect(() => {
    if (!search.trim()) return setFiltered(cards);
    const q = search.toLowerCase();
    setFiltered(
      cards.filter(
        (c) =>
          c.bank.toLowerCase().includes(q) ||
          c.cardName.toLowerCase().includes(q)
      )
    );
  }, [search, cards]);

  // TOAST
  const showToast = (msg: string) => {
    setToastMsg(msg);
    Animated.sequence([
      Animated.timing(toastOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.delay(1300),
      Animated.timing(toastOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // 🔥 DELETE CARD
  const handleDelete = async (id: string) => {
    if (!user) return;

    Alert.alert("Delete Card?", "This action cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteDoc(doc(firestore, "users", user.uid, "cards", id));
            const updated = cards.filter((c) => c.id !== id);
            setCards(updated);
            setFiltered(updated);
            showToast("Card Removed");

            await addNotification(
              "Card Removed",
              "You have removed a card from your wallet.",
              "warning"
            );
          } catch (err) {
            Alert.alert("Error", "Failed to delete card.");
          }
        },
      },
    ]);
  };

  // OPEN EDIT
  const openEdit = (card: CardType) => {
    setSelected(card);
    setAdjustType(null);
    setAdjustValue("");
    setEditVisible(true);
  };

  // 🔥 ADD/REDEEM POINTS
  const saveAdjust = async () => {
    if (!user || !selected || !adjustType || !adjustValue.trim()) {
      Alert.alert("Error", "Enter a valid number");
      return;
    }

    const value = Number(adjustValue);
    if (isNaN(value) || value <= 0) {
      Alert.alert("Error", "Invalid number");
      return;
    }

    const rule = rewardRules.find(
      (r) => r.bank === selected.bank && r.cardName === selected.cardName
    );

    const newPoints =
      adjustType === "add"
        ? selected.points + value
        : Math.max(0, selected.points - value);

    try {
      const ref = doc(firestore, "users", user.uid, "cards", selected.id);

      await updateDoc(ref, {
        points: newPoints,
      });

      const updated = cards.map((c) =>
        c.id === selected.id
          ? { ...c, points: newPoints }
          : c
      );

      setCards(updated);
      setFiltered(updated);
      setEditVisible(false);

      const msgType = adjustType === "add" ? "Points Added" : "Points Redeemed";
      showToast(msgType);

      await addNotification(
        msgType,
        `You ${adjustType === "add" ? "added" : "redeemed"} ${value} points on ${selected.cardName}.`,
        "info"
      );

      // Log history
      await logHistory(user.uid, selected.cardName, adjustType, value);
    } catch (err) {
      Alert.alert("Error", "Failed to update card.");
    }
  };

  // RIGHT SWIPE DELETE
  const renderRightActions = (id: string) => (
    <TouchableOpacity style={styles.swipeDelete} onPress={() => handleDelete(id)}>
      <Ionicons name="trash-outline" color="#fff" size={24} />
      <Text style={{ color: "#fff", marginTop: 4 }}>Delete</Text>
    </TouchableOpacity>
  );

  // CARD ITEM
  const renderItem = ({ item }: { item: CardType }) => {
    const logoSource = bankLogos[item.bank] || fallbackLogo;

    return (
      <Swipeable renderRightActions={() => renderRightActions(item.id)} overshootRight={false}>
        <TouchableOpacity activeOpacity={0.9} onPress={() => { setDetailCard(item); setDetailVisible(true); }}>
          <LinearGradient colors={[CARD_BG, "#0d0d0d"]} style={styles.cardBox}>
            <View style={styles.left}>
              <View style={styles.logoWrapper}>
                <Image source={logoSource} style={styles.cardLogo} resizeMode="contain" />
              </View>
              <View style={{ marginLeft: 16, flex: 1 }}>
                <Text style={styles.title}>{item.cardName}</Text>
                <Text style={styles.subtitle}>{item.bank}</Text>
                <Text style={styles.pointsText}>{item.points.toLocaleString()} pts</Text>

                {/* ⭐ Best Ways to Redeem */}
                {item.suggestions && item.suggestions.length > 0 && (
                  <View style={styles.suggestionsList}>
                    <Text style={styles.suggestionsHeader}>Best Ways to Redeem:</Text>
                    {item.suggestions.slice(0, 2).map((s, idx) => (
                      <View key={idx} style={styles.suggestionItem}>
                        <Ionicons name="sparkles-outline" size={12} color={GOLD} style={{ marginRight: 6, marginTop: 2 }} />
                        <Text style={styles.suggestionText} numberOfLines={2}>
                          {s}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </View>
            <TouchableOpacity onPress={() => openEdit(item)} style={styles.editBtn}>
              <Ionicons name="create-outline" size={22} color={GOLD} />
            </TouchableOpacity>
          </LinearGradient>
        </TouchableOpacity>
      </Swipeable>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* TOAST */}
      <Animated.View style={[styles.toast, { opacity: toastOpacity }]}>
        <Text style={styles.toastText}>{toastMsg}</Text>
      </Animated.View>

      <Text style={styles.header}>My Wallet</Text>

      <TextInput
        placeholder="Search bank or card…"
        placeholderTextColor={MUTED}
        style={styles.search}
        value={search}
        onChangeText={setSearch}
      />

      {/* ⭐ EMPTY STATE FIX ⭐ */}
      {filtered.length === 0 && search.trim() === "" ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyState}>No cards in your wallet.</Text>
          <Text style={styles.emptySub}>Tap + to fix that!</Text>
        </View>
      ) : null}

      <FlatList
        data={filtered}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      />

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => router.push("/AddNewCardScreen")}>
        <LinearGradient colors={[GOLD, "#d3b088"]} style={styles.fabInner}>
          <Ionicons name="add" size={32} color="#000" />
        </LinearGradient>
      </TouchableOpacity>

      {/* EDIT MODAL */}
      <Modal visible={editVisible} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setEditVisible(false)} />

        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalCenter}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>{selected?.cardName}</Text>
              <TouchableOpacity onPress={() => setEditVisible(false)}>
                <Ionicons name="close" size={26} color={MUTED} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalBalance}>
              Current: <Text style={{ color: GOLD }}>{selected?.points?.toLocaleString()}</Text>
            </Text>

            <View style={styles.adjustRow}>
              <TouchableOpacity
                style={[styles.adjustBtn, adjustType === "add" && styles.adjustActive]}
                onPress={() => setAdjustType("add")}
              >
                <Ionicons name="add" size={20} color={adjustType === "add" ? BG : GOLD} />
                <Text style={[styles.adjustText, adjustType === "add" && { color: BG }]}>Add</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.adjustBtn, adjustType === "redeem" && styles.adjustActive]}
                onPress={() => setAdjustType("redeem")}
              >
                <Ionicons name="remove" size={20} color={adjustType === "redeem" ? BG : GOLD} />
                <Text style={[styles.adjustText, adjustType === "redeem" && { color: BG }]}>
                  Redeem
                </Text>
              </TouchableOpacity>
            </View>

            {adjustType && (
              <TextInput
                style={styles.adjustInput}
                placeholder="Enter points"
                placeholderTextColor={MUTED}
                keyboardType="numeric"
                value={adjustValue}
                onChangeText={setAdjustValue}
                autoFocus
              />
            )}

            <TouchableOpacity style={styles.updateBtn} onPress={saveAdjust}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#000" />
              <Text style={styles.updateText}>Done</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* DETAIL MODAL */}
      <Modal visible={detailVisible} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setDetailVisible(false)} />
        <View style={styles.detailSheet}>
          <View style={styles.sheetHandle} />
          
          <View style={styles.detailHeader}>
            <View style={styles.detailLogoWrapper}>
              <Image 
                source={detailCard ? (bankLogos[detailCard.bank] || fallbackLogo) : fallbackLogo} 
                style={styles.detailLogo} 
                resizeMode="contain" 
              />
            </View>
            <View style={{ flex: 1, marginLeft: 16 }}>
              <Text style={styles.detailTitle}>{detailCard?.cardName}</Text>
              <Text style={styles.detailSubtitle}>{detailCard?.bank}</Text>
            </View>
            <TouchableOpacity onPress={() => setDetailVisible(false)} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.detailStats}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Current Balance</Text>
              <Text style={styles.statValue}>{detailCard?.points.toLocaleString()} <Text style={{ fontSize: 14 }}>pts</Text></Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Expiring On</Text>
              <Text style={styles.statValue}>{detailCard?.expiry || "N/A"}</Text>
            </View>
          </View>

          <ScrollView style={styles.detailContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.detailSectionTitle}>Reward Strategy</Text>
            {detailCard?.suggestions.map((s, i) => (
              <View key={i} style={styles.fullSuggestionItem}>
                <View style={styles.bulletPoint}>
                  <Ionicons name="star" size={12} color={GOLD} />
                </View>
                <Text style={styles.fullSuggestionText}>{s}</Text>
              </View>
            ))}

            <Text style={[styles.detailSectionTitle, { marginTop: 20 }]}>Reward Ladder</Text>
            {detailCard && getMilestoneLadder(detailCard.bank, detailCard.cardName).map((m, i) => {
              const isUnlocked = detailCard.points >= m.pointsRequired;
              return (
                <View key={`ladder-${i}`} style={[
                  styles.fullSuggestionItem, 
                  isUnlocked && { backgroundColor: "rgba(168, 124, 95, 0.1)", borderColor: GOLD, borderWidth: 1 }
                ]}>
                  <View style={styles.bulletPoint}>
                    <Ionicons 
                      name={isUnlocked ? (m.icon as any) : "lock-closed-outline"} 
                      size={14} 
                      color={isUnlocked ? GOLD : "#444"} 
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.fullSuggestionText, isUnlocked && { color: "#fff", fontWeight: "700" }]}>{m.name}</Text>
                    <Text style={[styles.fullSuggestionText, { fontSize: 12, color: "#666", marginTop: 2 }]}>{m.description}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end", marginLeft: 10 }}>
                    <Text style={[styles.fullSuggestionText, { fontSize: 13, fontWeight: "800", color: isUnlocked ? GOLD : "#444" }]}>
                      {m.pointsRequired.toLocaleString()} pts
                    </Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>

          <TouchableOpacity 
            style={styles.detailEditBtn} 
            onPress={() => {
              setDetailVisible(false);
              if (detailCard) openEdit(detailCard);
            }}
          >
            <Ionicons name="create-outline" size={20} color="#000" style={{ marginRight: 8 }} />
            <Text style={styles.detailEditBtnText}>Adjust Balance</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.detailEditBtn, { marginTop: 12, backgroundColor: "transparent", borderWidth: 1, borderColor: "#333" }]} 
            onPress={() => setDetailVisible(false)}
          >
            <Text style={[styles.detailEditBtnText, { color: "#fff" }]}>Done</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ⭐ UI ONLY FIXES BELOW ⭐
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
    paddingHorizontal: 20,
    paddingTop: 10
  },

  header: {
    color: GOLD,
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 20,
    marginTop: 10,
    letterSpacing: 0.5,
  },

  search: {
    backgroundColor: "#111",
    padding: 16,
    color: "#fff",
    borderRadius: 16,
    borderColor: "#333",
    borderWidth: 1,
    marginBottom: 24,
    fontSize: 16,
  },

  // ⭐ EMPTY STATE STYLE
  emptyContainer: {
    alignItems: 'center',
    marginTop: 50,
    opacity: 0.6
  },
  emptyState: {
    color: MUTED,
    fontSize: 16,
    marginBottom: 5,
  },
  emptySub: {
    color: GOLD,
    fontSize: 14,
    fontWeight: "600"
  },

  cardBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 18,
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#3a2d21",
    shadowColor: GOLD,
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },

  left: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  logoWrapper: {
    width: 54,
    height: 34,
    borderRadius: 8,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    padding: 4,
  },

  cardLogo: {
    width: "100%",
    height: "100%",
  },

  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.3,
  },

  subtitle: {
    fontSize: 13,
    color: "#888",
    marginTop: 2,
  },

  pointsText: {
    color: GOLD,
    marginTop: 4,
    fontWeight: "700",
    fontSize: 14,
  },

  suggestionsList: {
    marginTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: "rgba(168, 124, 95, 0.2)",
    paddingTop: 8,
  },

  suggestionsHeader: {
    color: "#aaa",
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },

  suggestionItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 4,
  },

  suggestionText: {
    color: "#eee",
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },

  editBtn: {
    padding: 8,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 10,
  },

  swipeDelete: {
    backgroundColor: "#f44336",
    justifyContent: "center",
    alignItems: "center",
    width: 80,
    borderRadius: 20,
    marginBottom: 16,
    marginLeft: 10,
  },

  fab: {
    position: "absolute",
    right: 20,
    bottom: 30,
    width: 64,
    height: 64,
    borderRadius: 32,
    shadowColor: GOLD,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },

  fabInner: {
    flex: 1,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
  },

  modalCenter: {
    width: "100%",
    position: "absolute",
    bottom: 0, // Bottom sheet style? Or Center? Let's keep center for now or adjust
    top: 0,
    justifyContent: 'center',
    padding: 20
  },

  modalCard: {
    backgroundColor: "#161616",
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "#333",
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },

  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  modalTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
  },

  modalBalance: {
    color: "#888",
    marginTop: 8,
    fontSize: 16,
    fontWeight: "500",
  },

  adjustRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 24,
    gap: 12
  },

  adjustBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: GOLD,
    borderRadius: 16,
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: 'center',
    backgroundColor: "rgba(168, 124, 95, 0.1)",
  },

  adjustActive: {
    backgroundColor: GOLD,
  },

  adjustText: {
    color: GOLD,
    fontWeight: "700",
    marginLeft: 8,
    fontSize: 16,
  },

  adjustInput: {
    marginTop: 20,
    backgroundColor: "#000",
    borderRadius: 16,
    padding: 16,
    color: "#fff",
    borderWidth: 1,
    borderColor: "#333",
    fontSize: 18,
    textAlign: 'center',
    fontWeight: 'bold'
  },

  updateBtn: {
    backgroundColor: GOLD,
    paddingVertical: 16,
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: 'center',
    marginTop: 24,
    shadowColor: GOLD,
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },

  updateText: {
    color: "#000",
    marginLeft: 8,
    fontWeight: "700",
    fontSize: 16,
  },

  toast: {
    position: "absolute",
    top: 60,
    zIndex: 9999,
    backgroundColor: "#fff",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 30,
    alignSelf: "center",
  },

  toastText: {
    color: "#000",
    fontWeight: "700",
  },

  // --- DETAIL MODAL STYLES ---
  detailSheet: {
    backgroundColor: "#111",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
    width: "100%",
    position: "absolute",
    bottom: 0,
    borderWidth: 1,
    borderColor: "#333",
    maxHeight: "85%",
  },

  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#333",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },

  detailHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },

  detailLogoWrapper: {
    width: 70,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    padding: 6,
  },

  detailLogo: {
    width: "100%",
    height: "100%",
  },

  detailTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "800",
  },

  detailSubtitle: {
    color: "#888",
    fontSize: 15,
    marginTop: 2,
  },

  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#222",
    justifyContent: "center",
    alignItems: "center",
  },

  detailStats: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 24,
  },

  statBox: {
    flex: 1,
    backgroundColor: "#1a1a1a",
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#222",
  },

  statLabel: {
    color: "#888",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: 8,
  },

  statValue: {
    color: GOLD,
    fontSize: 18,
    fontWeight: "800",
  },

  detailContent: {
    marginBottom: 30,
  },

  detailSectionTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
  },

  fullSuggestionItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
    backgroundColor: "rgba(255,255,255,0.03)",
    padding: 14,
    borderRadius: 16,
  },

  bulletPoint: {
    marginTop: 4,
    marginRight: 12,
  },

  fullSuggestionText: {
    color: "#ddd",
    fontSize: 14,
    lineHeight: 22,
    flex: 1,
  },

  detailEditBtn: {
    backgroundColor: GOLD,
    paddingVertical: 18,
    borderRadius: 20,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },

  detailEditBtnText: {
    color: "#000",
    fontWeight: "800",
    fontSize: 16,
  },
});
