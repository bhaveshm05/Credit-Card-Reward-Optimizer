import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  Dimensions,
  ActivityIndicator,
  Modal,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { auth, firestore } from "../../firebase/firebaseConfig";
import { collection, query, onSnapshot } from "firebase/firestore";
import { getNextMilestone, getSuggestion, getMilestoneLadder } from "../../utils/rewardCalculator";
import { rewardRules } from "../../data/rewardRules";

const { width } = Dimensions.get("window");
const GOLD = "#a87c5f";
const BG = "#000";
const CARD_BG = "#1a1a1a";

export default function RewardsScreen() {
  const [user, setUser] = useState(auth.currentUser);
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState<any>(null);
  const [detailVisible, setDetailVisible] = useState(false);

  // 1. Auth Listener
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => setUser(u));
    return unsub;
  }, []);

  // 2. Real-time Cards Listener
  useEffect(() => {
    if (!user) return;

    const q = query(collection(firestore, "users", user.uid, "cards"));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          // Calculate Real-time Stats
          suggestion: getSuggestion(data.bank, data.cardName),
          milestone: getNextMilestone(data.bank, data.cardName, data.points),
        };
      });
      setCards(list);
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={GOLD} />
      </View>
    );
  }

  const renderItem = ({ item }: { item: any }) => {
    const progress = item.milestone.percentageComplete ?? 0;
    const progressWidth = Math.min(100, Math.max(5, (isNaN(progress) ? 0 : progress) * 100)) + "%";

    return (
      <TouchableOpacity 
        activeOpacity={0.9} 
        onPress={() => {
          setSelectedCard(item);
          setDetailVisible(true);
        }}
      >
        <LinearGradient
          colors={[CARD_BG, "#252525"]}
          style={styles.cardContainer}
        >
          {/* Header */}
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.cardName}>{item.cardName}</Text>
              <Text style={styles.bankName}>{item.bank}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.points}>{(item.points ?? 0).toLocaleString()} pts</Text>
            </View>
          </View>

          {/* Suggestion */}
          <View style={styles.suggestionBox}>
            <Ionicons name="bulb-outline" size={16} color={GOLD} style={{ marginRight: 6 }} />
            <Text style={styles.suggestionText}>{item.suggestion}</Text>
          </View>

          {/* Milestone Progress */}
          <View style={styles.milestoneContainer}>
            <View style={styles.milestoneHeader}>
              <Text style={styles.milestoneTitle}>
                Next Goal: <Text style={{ color: "#fff" }}>{item.milestone.targetName}</Text>
              </Text>
            </View>

            <View style={styles.progressBarBg}>
              <LinearGradient
                colors={[GOLD, "#d4af37"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressBarFill, { width: progressWidth as any }]}
              />
            </View>

            <Text style={styles.pointsNeeded}>
              Earn <Text style={{ color: GOLD, fontWeight: "900" }}>{(item.milestone.pointsNeeded ?? 0).toLocaleString()}</Text> more points for this!
            </Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  // 3. Helper to get full rule
  const getFullRule = (cardModel: any) => {
    return rewardRules.find(r => r.bank === cardModel?.bank && r.cardName === cardModel?.cardName);
  };

  const rule = getFullRule(selectedCard);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.screenTitle}>Rewards & Milestones</Text>
        {cards.length === 0 ? (
          <Text style={styles.emptyText}>Add cards to see reward suggestions.</Text>
        ) : (
          <FlatList
            data={cards}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Detail Modal */}
        <Modal
          visible={detailVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setDetailVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>{selectedCard?.cardName}</Text>
                  <Text style={styles.modalSubtitle}>{selectedCard?.bank}</Text>
                </View>
                <TouchableOpacity onPress={() => setDetailVisible(false)}>
                  <Ionicons name="close-circle" size={32} color={GOLD} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollContent}>
                {/* Points Card */}
                <LinearGradient colors={[CARD_BG, "#222"]} style={styles.modalPointsCard}>
                  <Text style={styles.modalPointsLabel}>Total Points</Text>
                  <Text style={styles.modalPointsValue}>{(selectedCard?.points ?? 0).toLocaleString()}</Text>
                  <Text style={styles.modalPointsType}>{rule?.pointsName}</Text>
                </LinearGradient>

                {/* Milestone Ladder (New!) */}
                <Text style={styles.sectionTitle}>Your Reward Ladder</Text>
                {getMilestoneLadder(selectedCard?.bank, selectedCard?.cardName).map((m, i) => {
                  const isUnlocked = selectedCard?.points >= m.pointsRequired;
                  return (
                    <View key={`ladder-${i}`} style={[
                      styles.ladderItem,
                      isUnlocked && { backgroundColor: "rgba(168, 124, 95, 0.1)" }
                    ]}>
                      <View style={styles.ladderIconBox}>
                        <Ionicons 
                          name={isUnlocked ? (m.icon as any) : "lock-closed-outline"} 
                          size={20} 
                          color={isUnlocked ? GOLD : "#444"} 
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.ladderName, isUnlocked && { color: "#fff" }]}>{m.name}</Text>
                        <Text style={styles.ladderDesc}>{m.description}</Text>
                      </View>
                      <View style={{ alignItems: "flex-end" }}>
                        <Text style={[styles.ladderPoints, isUnlocked && { color: GOLD }]}>
                          {(m.pointsRequired ?? 0).toLocaleString()} pts
                        </Text>
                      </View>
                    </View>
                  );
                })}

                {/* Milestones */}
                {rule?.milestones && rule.milestones.length > 0 && (
                  <>
                    <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Key Milestones</Text>
                    {rule.milestones.map((m: string, i: number) => (
                      <View key={`m-${i}`} style={[styles.infoRow, { backgroundColor: "rgba(168, 124, 95, 0.05)", borderRadius: 8, padding: 8 }]}>
                        <Ionicons name="trophy-outline" size={14} color={GOLD} style={{ marginTop: 2, marginRight: 10 }} />
                        <Text style={[styles.infoText, { color: GOLD }]}>{m}</Text>
                      </View>
                    ))}
                  </>
                )}

                {/* Exclusions */}
                <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Exclusions (No Earnings)</Text>
                <View style={styles.exclusionBox}>
                  {rule?.exclusions.map((e: string, i: number) => (
                    <Text key={`e-${i}`} style={styles.exclusionText}>• {e}</Text>
                  ))}
                </View>

                {/* Partners */}
                {rule?.transferPartners && rule.transferPartners.length > 0 && (
                  <>
                    <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Transfer Partners</Text>
                    <View style={styles.partnersList}>
                      {rule.transferPartners.map((p: string, i: number) => (
                        <View key={`p-${i}`} style={styles.partnerBadge}>
                          <Text style={styles.partnerText}>{p}</Text>
                        </View>
                      ))}
                    </View>
                  </>
                )}

                <View style={{ height: 40 }} />
              </ScrollView>

              <TouchableOpacity style={styles.closeBtn} onPress={() => setDetailVisible(false)}>
                <Text style={styles.closeBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BG,
  },
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: BG,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: GOLD,
    marginBottom: 20,
    letterSpacing: 0.5,
  },
  emptyText: {
    color: "#666",
    fontSize: 16,
    textAlign: "center",
    marginTop: 50,
  },
  cardContainer: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#333",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  cardName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  bankName: {
    fontSize: 14,
    color: "#888",
    marginTop: 4,
  },
  points: {
    fontSize: 18,
    fontWeight: "800",
    color: GOLD,
  },
  value: {
    fontSize: 13,
    color: "#aaa",
    marginTop: 2,
  },
  suggestionBox: {
    flexDirection: "row",
    backgroundColor: "rgba(168, 124, 95, 0.15)",
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: "center",
  },
  suggestionText: {
    color: "#ddd",
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  milestoneContainer: {
    marginTop: 4,
  },
  milestoneHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  milestoneTitle: {
    color: "#aaa",
    fontSize: 13,
    fontWeight: "600",
  },
  milestonePercent: {
    color: GOLD,
    fontSize: 13,
    fontWeight: "800",
  },
  progressBarBg: {
    height: 8,
    backgroundColor: "#333",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  pointsNeeded: {
    color: "#666",
    fontSize: 12,
    textAlign: "right",
    fontStyle: "italic",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#121212",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    height: "85%",
    padding: 24,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#fff",
  },
  modalSubtitle: {
    fontSize: 14,
    color: GOLD,
    marginTop: 4,
  },
  scrollContent: {
    flex: 1,
  },
  modalPointsCard: {
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    marginBottom: 24,
  },
  modalPointsLabel: {
    color: "#888",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  modalPointsValue: {
    color: GOLD,
    fontSize: 32,
    fontWeight: "900",
    marginVertical: 4,
  },
  modalPointsType: {
    color: "#555",
    fontSize: 14,
    fontWeight: "600",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 10,
    alignItems: "flex-start",
  },
  infoText: {
    color: "#bbb",
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  exclusionBox: {
    backgroundColor: "#1a1a1a",
    padding: 16,
    borderRadius: 12,
  },
  exclusionText: {
    color: "#777",
    fontSize: 13,
    marginBottom: 6,
  },
  partnersList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  partnerBadge: {
    backgroundColor: "#222",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333",
  },
  partnerText: {
    color: "#aaa",
    fontSize: 12,
  },
  closeBtn: {
    backgroundColor: GOLD,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 20,
  },
  closeBtnText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "800",
  },
  ladderItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a1a1a",
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#333",
  },
  ladderIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#222",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  ladderName: {
    color: "#888",
    fontSize: 14,
    fontWeight: "700",
  },
  ladderDesc: {
    color: "#666",
    fontSize: 11,
    marginTop: 2,
  },
  ladderPoints: {
    color: "#555",
    fontSize: 13,
    fontWeight: "800",
  },
  ladderValue: {
    color: "#444",
    fontSize: 10,
    marginTop: 2,
  },
});
