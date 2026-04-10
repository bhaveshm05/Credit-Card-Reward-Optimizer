import React, { useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
  SafeAreaView,
  Animated,
  ActivityIndicator,
} from "react-native";
import { LineChart, BarChart } from "react-native-chart-kit";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { auth, firestore } from "../../firebase/firebaseConfig";
import { collection, query, orderBy, onSnapshot, getDocs } from "firebase/firestore";
import { getNextMilestone } from "../../utils/rewardCalculator";

const screenWidth = Dimensions.get("window").width;
const GOLD = "#a87c5f";
const DARK_BG = "#000";

export default function AnalysisScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [user, setUser] = useState(auth.currentUser);

  const [loading, setLoading] = useState(true);
  const [monthlyData, setMonthlyData] = useState<any>(null);
  const [efficiencyData, setEfficiencyData] = useState<any>(null);
  interface Insight {
    title: string;
    description: string;
    positive: boolean;
  }
  const [insights, setInsights] = useState<Insight[]>([]);

  // Raw Data
  const [rawHistory, setRawHistory] = useState<any[]>([]);
  const [activeCards, setActiveCards] = useState<Set<string>>(new Set());

  // 1. Listen for Auth
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(u => setUser(u));
    return unsub;
  }, []);

  // 2. Real-time Listeners
  useEffect(() => {
    if (!user) return;

    // HISTORY Listener
    const historyQ = query(
      collection(firestore, "users", user.uid, "history"),
      orderBy("createdAt", "asc")
    );
    const unsubHistory = onSnapshot(historyQ, (snap) => {
      const h = snap.docs.map((d) => d.data());
      setRawHistory(h);
    });

    // CARDS Listener (for filtering deleted cards)
    const cardsQ = query(collection(firestore, "users", user.uid, "cards"));
    const unsubCards = onSnapshot(cardsQ, (snap) => {
      const cardList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const names = new Set(cardList.map((c: any) => c.cardName));
      setActiveCards(names);
      
      // Calculate milestone-based insights if we have the cards
      generateAdvancedInsights(cardList);
    });

    // Animation start
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    return () => {
      unsubHistory();
      unsubCards();
    };
  }, [user]);

  // 3. Process Data when history or cards change
  useEffect(() => {
    if (rawHistory && activeCards) {
      processData(rawHistory, activeCards);
      setLoading(false);
    }
  }, [rawHistory, activeCards]);


  const processData = (history: any[], activeCardNames: Set<string>) => {
    // 1. Monthly Trend (Keep all history, even deleted cards, for accurate past totals)
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const currentMonth = new Date().getMonth();
    const labels = [];
    const dataPoints = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(currentMonth - i);
      const mIndex = d.getMonth();
      const mName = months[mIndex];
      const year = d.getFullYear();

      labels.push(mName);

      const monthlyTotal = history
        .filter((h) => {
          if (!h.createdAt) return false;
          // Filter by active cards (User request: remove history if card deleted)
          if (!activeCardNames.has(h.cardName)) return false;

          const date = h.createdAt.toDate ? h.createdAt.toDate() : new Date(h.createdAt);
          return date.getMonth() === mIndex && date.getFullYear() === year;
        })
        .reduce((sum, h) => {
          const pts = Number(h.points) || 0;
          if (h.type === 'add' || h.type === 'initial') return sum + pts;
          if (h.type === 'redeem') return sum - pts;
          return sum;
        }, 0);

      dataPoints.push(monthlyTotal);
    }

    setMonthlyData({
      labels,
      datasets: [
        {
          data: dataPoints.length > 0 ? dataPoints : [0, 0, 0, 0, 0, 0],
          color: (opacity = 1) => `rgba(168, 124, 95, ${opacity})`,
          strokeWidth: 2,
        },
      ],
      legend: ["Points Earned"],
    });

    // 2. Efficiency / Card Distribution (ONLY ACTIVE CARDS)
    const cardStats: Record<string, number> = {};
    history.forEach((h) => {
      // Only count if card is currently active?
      // User asked: "if i delete the card is shown not removed" -> implies they want it removed.
      // So we filter by activeCardNames.
      if (activeCardNames.has(h.cardName)) {
        const pts = Number(h.points) || 0;
        if (h.type === 'add' || h.type === 'initial') {
          cardStats[h.cardName] = (cardStats[h.cardName] || 0) + pts;
        } else if (h.type === 'redeem') {
          cardStats[h.cardName] = (cardStats[h.cardName] || 0) - pts;
        }
      }
    });

    const sortedCards = Object.entries(cardStats)
      .sort((a, b) => b[1] - a[1]) // Sort by highest points
      .slice(0, 4);

    if (sortedCards.length > 0) {
      setEfficiencyData({
        labels: sortedCards.map(([name]) => name.length > 6 ? name.substring(0, 6) + ".." : name),
        datasets: [{ data: sortedCards.map(([_, pts]) => pts) }],
      });
    } else {
      setEfficiencyData({
        labels: ["No Active Cards"],
        datasets: [{ data: [0] }],
      });
    }

    // 3. Insights
    const newInsights = [...insights]; // Start with any existing ones or handle separately

    // Filter history for insights to match active cards only
    const activeHistory = history.filter(h => activeCardNames.has(h.cardName));

    const totalEarned = activeHistory.reduce((sum, h) => sum + (h.type === 'add' || h.type === 'initial' ? Number(h.points) : 0), 0);
    const totalRedeemed = activeHistory.reduce((sum, h) => sum + (h.type === 'redeem' ? Number(h.points) : 0), 0);

    // Filter out very basic insights if we have advanced ones?
    // Let's keep them but make them smarter
    if (totalEarned > 50000) {
      newInsights.push({
        title: "Point Milestone",
        description: `Impressive! You've crossed the 50k lifetime points mark across your active portfolio.`,
        positive: true
      });
    }

    if (totalRedeemed > 0) {
      newInsights.push({
        title: "Value Extracted",
        description: `You've successfully redeemed ${totalRedeemed.toLocaleString()} points. Smart utilization of rewards!`,
        positive: true
      });
    }

    // Deduplicate or just set
    setInsights(prev => {
      const combined = [...prev, ...newInsights];
      // Simple dedupe by title
      const unique = combined.filter((v, i, a) => a.findIndex(t => t.title === v.title) === i);
      return unique.slice(-4); // Keep last 4 most relevant
    });
  };

  const generateAdvancedInsights = (cardList: any[]) => {
    const advInsights: Insight[] = [];

    // 1. Closest Milestone
    let closestCard: any = null;
    let maxProgress = -1;

    cardList.forEach(card => {
        const m = getNextMilestone(card.bank, card.cardName, card.points);
        if (m.percentageComplete > maxProgress && m.percentageComplete < 1) {
            maxProgress = m.percentageComplete;
            closestCard = { ...card, milestone: m };
        }
    });

    if (closestCard && maxProgress > 0.7) {
      advInsights.push({
        title: "Reward Imminent!",
        description: `You are ${(100 - (maxProgress * 100)).toFixed(0)}% away from unlocking ${closestCard.milestone.targetName} on your ${closestCard.cardName}.`,
        positive: true
      });
    }

    // 2. Portfolio Balance Check
    const cardCounts: Record<string, number> = {};
    cardList.forEach(c => { cardCounts[c.bank] = (cardCounts[c.bank] || 0) + 1; });
    const topBank = Object.entries(cardCounts).sort((a,b) => b[1] - (a[1] as any))[0];

    if (topBank && (topBank[1] as number) >= 3) {
        advInsights.push({
          title: "Bank Loyalty",
          description: `You have a strong concentration of cards with ${topBank[0]}. Consider a card from a different bank to diversify reward partners.`,
          positive: true
        });
    }

    // 3. Low Activity Warning
    if (cardList.length > 0 && rawHistory.length < cardList.length) {
        advInsights.push({
          title: "Incomplete History",
          description: "Some of your cards have no transaction history. Log spends to get better efficiency analysis.",
          positive: false
        });
    }

    setInsights(prev => {
        const combined = [...advInsights, ...prev];
        const unique = combined.filter((v, i, a) => a.findIndex(t => t.title === v.title) === i);
        return unique.slice(0, 4);
    });
  };

  const chartConfig = {
    backgroundColor: "#111",
    backgroundGradientFrom: "#111", // Match container
    backgroundGradientTo: "#111",
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(168, 124, 95, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(200, 200, 200, ${opacity})`, // Brighter labels
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: "4",
      strokeWidth: "2",
      stroke: GOLD,
    },
    fillShadowGradient: GOLD,
    fillShadowGradientOpacity: 0.3,
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={GOLD} />
        <Text style={{ color: '#fff', marginTop: 10 }}>Loading Analytics...</Text>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Animated.View style={{ opacity: fadeAnim }}>
          <Text style={styles.headerTitle}>Analytics & Insights</Text>

          {/* Monthly Trends Chart */}
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Monthly Points Trend</Text>
            {monthlyData && (
              <LineChart
                data={monthlyData}
                width={screenWidth - 60}
                height={220}
                yAxisLabel=""
                yAxisSuffix=""
                chartConfig={chartConfig}
                bezier
                style={styles.chart}
                withInnerLines={false}
                withOuterLines={false}
              />
            )}
          </View>

          {/* Efficiency Chart */}
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Top Earning Cards</Text>
            {efficiencyData && (
              <BarChart
                data={efficiencyData}
                width={screenWidth - 60}
                height={220}
                yAxisLabel=""
                yAxisSuffix=""
                chartConfig={{
                  ...chartConfig,
                  barPercentage: 0.7,
                }}
                style={styles.chart}
                showValuesOnTopOfBars
                withInnerLines={false}
              />
            )}
          </View>

          {/* Insights Section */}
          <View style={styles.insightsSection}>
            <Text style={styles.sectionHeader}>Key Insights</Text>
            {insights.map((item, index) => (
              <LinearGradient
                key={index}
                colors={["#1c1c1c", "#0f0f0f"]}
                style={styles.insightCard}
              >
                <View style={styles.insightHeader}>
                  <Ionicons
                    name={
                      item.positive
                        ? "trending-up-outline"
                        : "alert-circle-outline"
                    }
                    size={24}
                    color={item.positive ? "#4caf50" : "#ff9800"}
                  />
                  <Text style={styles.insightTitle}>{item.title}</Text>
                </View>
                <Text style={styles.insightText}>{item.description}</Text>
              </LinearGradient>
            ))}
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: DARK_BG,
  },
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  headerTitle: {
    color: GOLD,
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 24,
    textAlign: "left",
  },
  chartContainer: {
    marginBottom: 30,
    backgroundColor: "#111",
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: "#222",
  },
  chartTitle: {
    color: "#ccc",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
    marginLeft: 10,
    marginTop: 10,
  },
  chart: {
    borderRadius: 16,
    marginVertical: 8,
  },
  insightsSection: {
    marginTop: 10,
  },
  sectionHeader: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 16,
  },
  insightCard: {
    borderRadius: 12,
    padding: 18,
    marginBottom: 14,
    borderLeftWidth: 4,
    borderLeftColor: GOLD,
  },
  insightHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  insightTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 10,
  },
  insightText: {
    color: "#aaa",
    fontSize: 14,
    lineHeight: 20,
  },
});
