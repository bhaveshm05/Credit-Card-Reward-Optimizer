// CCRO/app/tabs/AddNewCardScreen.tsx
import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  SafeAreaView,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Animated,
  Image,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { rewardRules } from "@/data/rewardRules";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

// FIREBASE
import { auth, firestore } from "../firebase/firebaseConfig";
import { collection, query, getDocs, doc, setDoc } from "firebase/firestore";
import { useNotifications } from "../context/NotificationContext";
import { logHistory } from "../utils/historyUtils";

const GOLD = "#a87c5f";
const BG = "#0b0b0b";
const MUTED = "#9a9a9a";

// ---------- BANK LOGOS ----------
const bankLogos: Record<string, any> = {
  "HDFC Bank": require("../assets/banks/hdfc.png"),
  "ICICI Bank": require("../assets/banks/icici.png"),
  "Axis Bank": require("../assets/banks/axis.png"),
  "SBI": require("../assets/banks/sbi.png"),
  "Kotak Mahindra Bank": require("../assets/banks/kotak.png"),
  "IndusInd Bank": require("../assets/banks/indusind.png"),
  "YES Bank": require("../assets/banks/yes.png"),
  "Yes Bank": require("../assets/banks/yes.png"),
  "IDFC FIRST Bank": require("../assets/banks/idfc.png"),
  "Bank of Baroda": require("../assets/banks/bob.png"),
  "HSBC": require("../assets/banks/hsbc.png"),
  "American Express": require("../assets/banks/amex.png"),
  "Standard Chartered": require("../assets/banks/hdfc.png"), // Placeholder
  "RBL Bank": require("../assets/banks/hdfc.png"), // Placeholder
  "AU Bank": require("../assets/banks/hdfc.png") // Placeholder
};

const fallbackLogo = require("../assets/banks/hdfc.png");

type CardType = {
  id: string;
  bank: string;
  cardName: string;
  points: number;
  expiry: string;
  suggestions: string[];
  milestones?: string[];
};

export default function AddNewCardScreen() {
  const router = useRouter();
  const user = auth.currentUser;
  const { addNotification } = useNotifications();

  const banks: string[] = Array.from(new Set(rewardRules.map((r) => r.bank)));

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedBank, setSelectedBank] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [points, setPoints] = useState("");
  const [expiry, setExpiry] = useState("");
  const [availableCards, setAvailableCards] = useState<
    { cardName: string; suggestions?: string[] }[]
  >([]);
  const [currentSuggestions, setCurrentSuggestions] = useState<string[]>([]);


  // Animations
  const scales = [
    useRef(new Animated.Value(1)).current,
    useRef(new Animated.Value(1)).current,
    useRef(new Animated.Value(1)).current,
  ];

  const animateStep = (newStep: 1 | 2 | 3) => {
    setStep(newStep);
    scales.forEach((a, i) =>
      Animated.spring(a, {
        toValue: i === newStep - 1 ? 1.2 : 1,
        useNativeDriver: true,
      }).start()
    );
  };

  const cardAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(cardAnim, {
      toValue: 1,
      duration: 350,
      useNativeDriver: true,
    }).start();
  }, [step]);

  // Update list of cards when bank selected
  useEffect(() => {
    if (selectedBank) {
      setAvailableCards(
        rewardRules
          .filter((r) => r.bank === selectedBank)
          .map((r) => ({
            cardName: r.cardName,
            suggestions: r.suggestions,
          }))
      );
    }
    setSelectedCard(null);
  }, [selectedBank]);

  // Estimate update
  useEffect(() => {
    if (selectedBank && selectedCard && points) {
      const rule = rewardRules.find(
        (r) => r.bank === selectedBank && r.cardName === selectedCard
      );
      setCurrentSuggestions(rule?.suggestions ?? []);
    } else {
      setCurrentSuggestions([]);
    }
  }, [selectedBank, selectedCard, points]);

  // Success animation overlay
  const [successAnim] = useState(new Animated.Value(0));
  const [showSuccess, setShowSuccess] = useState(false);
  const playSuccessAnimation = () => {
    setShowSuccess(true);
    successAnim.setValue(0);
    Animated.timing(successAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start(() => {
      setTimeout(() => {
        setShowSuccess(false);
        router.back();
      }, 600);
    });
  };

  // -------- EXPIRY HANDLER (numbers + slash + N/A allowed) --------
  const handleExpiryChange = (text: string) => {
    const trimmed = text.trim();

    // Allow N/A in any format (na, n/a, N/A, etc)
    if (trimmed.toUpperCase() === "N/A") {
      setExpiry("N/A");
      return;
    }

    // Allow only digits + slash
    const cleaned = text.replace(/[^0-9/]/g, "");

    setExpiry(cleaned);
  };

  // -------- SAVE TO FIRESTORE --------
  const handleSave = async () => {
    if (!user) return Alert.alert("Login Required", "Please login first.");

    if (!selectedBank || !selectedCard || !points.trim()) {
      return Alert.alert("Missing Info", "Fill all required fields.");
    }

    const pts = Number(points);
    if (isNaN(pts)) return Alert.alert("Invalid", "Points must be numeric.");

    try {
      const q = query(collection(firestore, "users", user.uid, "cards"));
      const snap = await getDocs(q);

      const existing = snap.docs.map((d) => d.data() as CardType);

      const duplicate = existing.some(
        (c) =>
          c.bank.toLowerCase() === selectedBank.toLowerCase() &&
          c.cardName.toLowerCase() === selectedCard.toLowerCase()
      );

      if (duplicate) return Alert.alert("Duplicate", "Card already exists.");

      const rule = rewardRules.find(
        (r) => r.bank === selectedBank && r.cardName === selectedCard
      );

      const id = Date.now().toString();

      // FINAL expiry value
      const finalExpiry =
        expiry.trim() === "" ? "N/A" : expiry.toUpperCase() === "N/A" ? "N/A" : expiry;

      const newCard: CardType = {
        id,
        bank: selectedBank,
        cardName: selectedCard,
        points: pts,
        expiry: finalExpiry,
        suggestions: rule?.suggestions ?? [],
        milestones: rule?.milestones ?? [],
      };

      await setDoc(doc(firestore, "users", user.uid, "cards", id), newCard);

      await addNotification(
        "Card Added",
        `You successfully added ${selectedBank} - ${selectedCard} to your wallet.`,
        "success"
      );

      // Log history
      await logHistory(user.uid, selectedCard, "initial", pts);

      playSuccessAnimation();
    } catch (err) {
      console.log("Save Error:", err);
      Alert.alert("Error", "Failed to save card.");
    }
  };

  // Option renderer
  const RenderOption = ({
    label,
    active,
    onPress,
  }: {
    label: string;
    active: boolean;
    onPress: () => void;
  }) => {
    const pressScale = useRef(new Animated.Value(1)).current;
    const isBank = step === 1;
    const logo = isBank ? bankLogos[label] || fallbackLogo : null;

    return (
      <Animated.View
        style={{
          opacity: cardAnim,
          transform: [
            { translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [15, 0] }) },
            { scale: pressScale },
          ],
        }}
      >
        <Pressable
          onPressIn={() =>
            Animated.spring(pressScale, { toValue: 0.95, useNativeDriver: true }).start()
          }
          onPressOut={() =>
            Animated.spring(pressScale, { toValue: 1, useNativeDriver: true }).start(onPress)
          }
        >
          <LinearGradient
            colors={active ? ["#a87c5f", "#d3b088"] : ["#1a1a1a", "#0d0d0d"]}
            style={[styles.optionCard, active && styles.optionCardActive]}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              {logo && (
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 8,
                    backgroundColor: "#fff",
                    justifyContent: "center",
                    alignItems: "center",
                    marginRight: 12,
                  }}
                >
                  <Image
                    source={logo}
                    resizeMode="contain"
                    style={{ width: 28, height: 28 }}
                  />
                </View>
              )}
              <Text
                style={[
                  styles.optionLabel,
                  active && { color: "#000", fontWeight: "800" },
                ]}
              >
                {label}
              </Text>
            </View>

            <Ionicons
              name="arrow-forward-circle"
              size={22}
              color={active ? "#000" : GOLD}
            />
          </LinearGradient>
        </Pressable>
      </Animated.View>
    );
  };

  // -------------------- UI --------------------
  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.headerRow}>
        <TouchableOpacity
          onPress={() => {
            if (step === 1) router.back();
            else animateStep((step - 1) as 1 | 2 | 3);
          }}
        >
          <Ionicons name="chevron-back" size={26} color={GOLD} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Add Reward Card</Text>
        <View style={{ width: 26 }} />
      </View>

      {/* STEPPER */}
      <View style={styles.stepperModern}>
        <Animated.Text style={[styles.stepLabel, step === 1 && styles.stepLabelActive, { transform: [{ scale: scales[0] }] }]}>
          Bank
        </Animated.Text>
        <Animated.Text style={[styles.stepLabel, step === 2 && styles.stepLabelActive, { transform: [{ scale: scales[1] }] }]}>
          Card
        </Animated.Text>
        <Animated.Text style={[styles.stepLabel, step === 3 && styles.stepLabelActive, { transform: [{ scale: scales[2] }] }]}>
          Points
        </Animated.Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={{ flex: 1, marginTop: 18 }}>

          <ScrollView 
            showsVerticalScrollIndicator={false} 
            contentContainerStyle={{ paddingBottom: 40 }}
          >
            {/* STEP 1 */}
            {step === 1 && (
              <FlatList<string>
                data={banks}
                scrollEnabled={false} // Scroll is handled by parent ScrollView
                keyExtractor={(item) => item}
                renderItem={({ item }) => (
                  <RenderOption
                    label={item}
                    active={selectedBank === item}
                    onPress={() => {
                      setSelectedBank(item);
                      animateStep(2);
                    }}
                  />
                )}
              />
            )}

            {/* STEP 2 */}
            {step === 2 && (
              <>
                <Text style={styles.sectionLabel}>
                  Bank: <Text style={{ color: GOLD }}>{selectedBank}</Text>
                </Text>

                <FlatList<{ cardName: string; suggestions?: string[] }>
                  data={availableCards}
                  scrollEnabled={false} // Scroll is handled by parent ScrollView
                  keyExtractor={(item) => item.cardName}
                  renderItem={({ item }) => (
                    <RenderOption
                      label={item.cardName}
                      active={selectedCard === item.cardName}
                      onPress={() => {
                        setSelectedCard(item.cardName);
                        animateStep(3);
                      }}
                    />
                  )}
                />
              </>
            )}

            {/* STEP 3 */}
            {step === 3 && (
              <>
                <Text style={styles.sectionLabel}>
                  Card: <Text style={{ color: GOLD }}>{selectedCard}</Text>
                </Text>

                <Text style={styles.label}>Reward Points</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 12000"
                  placeholderTextColor={MUTED}
                  value={points}
                  onChangeText={setPoints}
                  keyboardType="numeric"
                />

                <Text style={[styles.label, { marginTop: 12 }]}>Expiry Date</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 12/2025 or N/A"
                  placeholderTextColor={MUTED}
                  value={expiry}
                  onChangeText={handleExpiryChange}
                  keyboardType="default"
                />

                {currentSuggestions.length > 0 && (
                  <View style={styles.suggestionBox}>
                    <Text style={styles.suggestionTitle}>Best Ways to Redeem</Text>

                    {currentSuggestions.map((s, i) => (
                      <View key={i} style={styles.suggestionRow}>
                        <Ionicons
                          name="checkmark-circle-outline"
                          size={18}
                          color={GOLD}
                          style={{ marginRight: 8 }}
                        />
                        <Text style={styles.suggestionText}>{s}</Text>
                      </View>
                    ))}
                  </View>
                )}

                <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                  <Text style={styles.saveText}>Done</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      {/* SUCCESS ANIMATION */}
      {showSuccess && (
        <Animated.View
          style={{
            position: "absolute",
            left: 0, right: 0,
            top: 0, bottom: 0,
            backgroundColor: "rgba(0,0,0,0.6)",
            justifyContent: "center",
            alignItems: "center",
            opacity: successAnim,
          }}
        >
          <Animated.View
            style={{
              transform: [
                {
                  scale: successAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.6, 1],
                  }),
                },
              ],
            }}
          >
            <LinearGradient
              colors={["#a87c5f", "#d3b088"]}
              style={{ padding: 40, borderRadius: 22, alignItems: "center" }}
            >
              <Ionicons name="checkmark-circle" size={70} color={BG} />
              <Text style={{ color: BG, marginTop: 10, fontSize: 20, fontWeight: "800" }}>
                Card Added!
              </Text>
            </LinearGradient>
          </Animated.View>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

// ------------------------ STYLES ------------------------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", padding: 18 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  headerTitle: { color: GOLD, fontSize: 20, fontWeight: "800" },
  stepperModern: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 26,
    marginBottom: 16,
  },
  stepLabel: { color: MUTED, fontSize: 15, fontWeight: "700" },
  stepLabelActive: { color: GOLD, fontWeight: "900" },
  optionCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#222",
    marginBottom: 14,
  },
  optionCardActive: {
    borderColor: GOLD,
    shadowColor: GOLD,
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  optionLabel: { color: "#fff", fontWeight: "700", fontSize: 15 },
  sectionLabel: { color: MUTED, marginBottom: 14, fontSize: 14 },
  label: { color: MUTED, marginBottom: 6 },
  input: {
    backgroundColor: "#111",
    color: "#fff",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#333",
    fontSize: 16,
  },
  saveBtn: {
    marginTop: 22,
    backgroundColor: GOLD,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  saveText: { color: "#000", fontWeight: "900", fontSize: 16 },
  suggestionBox: {
    marginTop: 18,
    backgroundColor: "#111",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#333",
  },
  suggestionTitle: {
    color: GOLD,
    fontWeight: "800",
    fontSize: 15,
    marginBottom: 10,
  },
  suggestionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  suggestionText: {
    color: "#e0e0e0",
    fontSize: 13.5,
    lineHeight: 19,
    flex: 1,
  },

});
