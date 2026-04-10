// CCRO/app/tabs/HomeScreen.tsx
import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";

// FIREBASE
import { auth, firestore } from "../../firebase/firebaseConfig";
import { collection, getDocs } from "firebase/firestore";
import { useNotifications } from "../../context/NotificationContext";
import { isExpiringSoon } from "../../utils/dateUtils";
import AsyncStorage from "@react-native-async-storage/async-storage";

const GOLD = "#a87c5f";
const DARK_BG = "#000";
const TEXT_MUTED = "#aaa";

const SCREEN_WIDTH = Dimensions.get("window").width;

type CardType = {
  id: string;
  bank: string;
  cardName: string;
  points: number;
  expiry: string;
  bestRedemption: string;
  suggestions: string[];
};

export default function HomeScreen() {
  const router = useRouter();
  const user = auth.currentUser;

  const [cards, setCards] = useState<CardType[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);

  const { unreadCount, addNotification } = useNotifications();

  //  Load cards from Firestore when screen focuses
  useFocusEffect(
    useCallback(() => {
      const loadCards = async () => {
        if (!user) return;

        try {
          const snap = await getDocs(
            collection(firestore, "users", user.uid, "cards")
          );

          const list = snap.docs.map((d) => d.data() as CardType);

          setCards(list);

          // calculate total points
          let total = 0;
          list.forEach((c) => (total += c.points || 0));
          setTotalPoints(total);
        } catch (err) {
          console.warn("Error loading cards:", err);
        }
      };

      loadCards();
    }, [user])
  );

  //  Check for expirations periodically (or on load)
  useEffect(() => {
    const checkExpirations = async () => {
      if (cards.length === 0) return;

      const lastCheck = await AsyncStorage.getItem("lastExpiryCheck");
      const now = Date.now();
      const ONE_DAY = 24 * 60 * 60 * 1000;

      // Only check once every 24 hours to avoid spamming
      if (lastCheck && now - parseInt(lastCheck) < ONE_DAY) {
        return;
      }

      let expiringCards = [];
      for (const card of cards) {
        if (isExpiringSoon(card.expiry)) {
          expiringCards.push(card.cardName);
        }
      }

      if (expiringCards.length > 0) {
        const msg = `Points for ${expiringCards.join(
          ", "
        )} are expiring soon! Redeem them now.`;

        await addNotification("Points Expiring Soon!", msg, "expiry");
        await AsyncStorage.setItem("lastExpiryCheck", now.toString());
      }
    };

    checkExpirations();
  }, [cards]);

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

  // ... inside component ...

  // --- Render each full-width card ---
  const renderCard = ({ item }: { item: CardType }) => {
    const logoSource = bankLogos[item.bank] || fallbackLogo;

    return (
      <View style={styles.cardWrapper}>
        <LinearGradient
          colors={["#2a2a2a", "#0f0f0f"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fullCard}
        >
          <View style={styles.cardHeader}>
            <View style={styles.logoContainer}>
              <Image source={logoSource} style={styles.cardImage} />
            </View>
            <Ionicons name="wifi-outline" size={24} color="rgba(255,255,255,0.3)" style={{ transform: [{ rotate: '90deg' }] }} />
          </View>

          <View style={styles.cardBody}>
            <Text style={styles.cardName} numberOfLines={1}>
              {item.cardName}
            </Text>
            <Text style={styles.bankName}>{item.bank}</Text>
          </View>

          <View style={styles.cardFooter}>
            <View>
              <Text style={styles.pointsLabelSmall}>Current Balance</Text>
              <Text style={styles.cardPoints}>
                {item.points.toLocaleString()} <Text style={styles.ptsText}>pts</Text>
              </Text>
            </View>
            <View style={styles.chip} />
          </View>
        </LinearGradient>
      </View>
    );
  };

  // --- Pagination State ---
  const [activeIndex, setActiveIndex] = useState(0);

  const onViewRef = React.useRef(({ viewableItems }: { viewableItems: any[] }) => {
    if (viewableItems.length > 0) {
      setActiveIndex(viewableItems[0].index || 0);
    }
  });

  const viewConfigRef = React.useRef({ viewAreaCoveragePercentThreshold: 50 });

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push("/ProfileScreen")}>
          <Ionicons name="person-circle-outline" size={30} color={GOLD} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Dashboard</Text>

        <TouchableOpacity onPress={() => router.push("/NotificationsScreen")}>
          <View>
            <Ionicons name="notifications-outline" size={30} color={GOLD} />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {unreadCount > 9 ? "9+" : unreadCount}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>

      {/* TOTAL POINTS */}
      <LinearGradient
        colors={["#2b1f17", "#0d0d0d"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.pointsBox}
      >
        <Text style={styles.pointsLabel}>Total Points Balance</Text>
        <Text style={styles.pointsValue}>{totalPoints.toLocaleString()}</Text>
      </LinearGradient>

      {/* SMART AI ADVISOR BANNERS */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => router.push("/AIAdvisorScreen")}
        style={styles.aiBanner}
      >
        <LinearGradient
          colors={["#a87c5f", "#4a3324"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.aiGradient}
        >
          <View style={styles.aiLeft}>
            <View style={styles.aiIcon}>
              <Ionicons name="sparkles" size={20} color="#000" />
            </View>
            <View>
              <Text style={styles.aiTitle}>Smart Reward Advisor</Text>
              <Text style={styles.aiSubtitle}>Ask AI how to maximize points</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#0d0d0d" />
        </LinearGradient>
      </TouchableOpacity>

      {/* CARDS SECTION */}
      <View style={styles.cardsSection}>
        <Text style={styles.sectionTitle}>Your Cards</Text>

        {cards.length === 0 ? (
          <TouchableOpacity
            style={styles.emptyContainer}
            onPress={() => router.push("/AddNewCardScreen")}
          >
            <Text style={styles.emptyText}>No cards added yet.</Text>
            <Text style={styles.emptyAction}>Tap to Add Card</Text>
          </TouchableOpacity>
        ) : (
          <>
            <FlatList
              data={cards}
              keyExtractor={(item) => item.id}
              renderItem={renderCard}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              snapToAlignment="start"
              decelerationRate="fast"
              snapToInterval={SCREEN_WIDTH - 40}
              onViewableItemsChanged={onViewRef.current}
              viewabilityConfig={viewConfigRef.current}
              contentContainerStyle={styles.flatListContent}
            />

            {/* Pagination Dots */}
            <View style={styles.paginationContainer}>
              {cards.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.dot,
                    {
                      width: index === activeIndex ? 20 : 8,
                      backgroundColor: index === activeIndex ? GOLD : "#333",
                    },
                  ]}
                />
              ))}
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

// ---------------- STYLES ----------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DARK_BG,
    paddingHorizontal: 20,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    marginBottom: 20,
  },

  headerTitle: {
    color: GOLD,
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: 0.5,
  },

  pointsBox: {
    borderRadius: 22,
    paddingVertical: 36,
    alignItems: "center",
    shadowColor: GOLD,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#3a2d21",
  },

  pointsLabel: {
    color: TEXT_MUTED,
    fontSize: 15,
    textTransform: "uppercase",
    letterSpacing: 1,
  },

  pointsValue: {
    color: "#fff",
    fontSize: 46,
    fontWeight: "800",
    marginTop: 8,
  },

  cardsSection: {
    flex: 1,
    marginTop: 35,
  },

  sectionTitle: {
    color: GOLD,
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
    letterSpacing: 0.5,
  },

  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 20,
    borderStyle: 'dashed',
  },

  emptyText: {
    color: TEXT_MUTED,
    fontSize: 16,
    marginBottom: 8,
  },

  emptyAction: {
    color: GOLD,
    fontSize: 16,
    fontWeight: "bold",
  },

  fullCard: {
    width: SCREEN_WIDTH - 40,
    height: 200,
    borderRadius: 20,
    padding: 24,
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "rgba(168, 124, 95, 0.3)",
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  cardWrapper: {
    width: SCREEN_WIDTH - 40,
    alignItems: "center",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardBody: {
    marginTop: 10,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  logoContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    padding: 6,
  },
  cardImage: {
    width: "100%",
    height: "100%",
    resizeMode: "contain",
  },
  cardName: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  bankName: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    marginTop: 4,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  pointsLabelSmall: {
    color: GOLD,
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  cardPoints: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "800",
  },
  ptsText: {
    fontSize: 14,
    fontWeight: "400",
    color: GOLD,
  },
  chip: {
    width: 35,
    height: 25,
    backgroundColor: "rgba(168, 124, 95, 0.2)",
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "rgba(168, 124, 95, 0.4)",
  },
  flatListContent: {
    paddingRight: 0,
  },

  badge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: "#f44336",
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  badgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "bold",
  },
  paginationContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 15,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },

  // --- AI BANNER STYLES ---
  aiBanner: {
    marginTop: 20,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: GOLD,
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  aiGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  aiLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  aiIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  aiTitle: {
    color: "#000",
    fontSize: 16,
    fontWeight: "800",
  },
  aiSubtitle: {
    color: "rgba(0, 0, 0, 0.7)",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 1,
  },
});
