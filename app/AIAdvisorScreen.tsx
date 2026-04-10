import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { askAI } from "../utils/aiService";
import { firestore as db, auth } from "../firebase/firebaseConfig";
import { collection, query, where, getDocs } from "firebase/firestore";

const GOLD = "#a87c5f";
const BG = "#000";
const CARD_BG = "#1a1a1a";

interface Message {
  id: string;
  text: string;
  sender: "user" | "ai";
}

export default function AIAdvisorScreen() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Hello! I'm your CCRO AI Advisor. Ask me anything about your credit card rewards or how to get the most value from your points!",
      sender: "ai",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [userCards, setUserCards] = useState<any[]>([]);
  const [aiStatus, setAiStatus] = useState<"online" | "local">("online");
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    fetchUserCards();
  }, []);

  const fetchUserCards = async () => {
    if (!auth.currentUser) return;
    try {
      const q = collection(db, "users", auth.currentUser.uid, "cards");
      const querySnapshot = await getDocs(q);
      const cards = querySnapshot.docs.map(doc => doc.data());
      setUserCards(cards);
    } catch (error) {
      console.error("Error fetching cards for AI:", error);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      text: input.trim(),
      sender: "user",
    };

    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    let aiResponse = await askAI(userMsg.text, userCards);

    // If AI fails (e.g. quota limit), use local rule-based logic
    if (aiResponse.includes("Connection error") || aiResponse.includes("AI Error")) {
      console.log("Gemini failed, falling back to local advisor.");
      setAiStatus("local");
      const { getLocalAdvice } = require("../utils/localAdvisor");
      aiResponse = getLocalAdvice(userMsg.text, userCards);
    } else {
      setAiStatus("online");
    }

    const aiMsg: Message = {
      id: (Date.now() + 1).toString(),
      text: aiResponse,
      sender: "ai",
    };

    setMessages(prev => [...prev, aiMsg]);
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>AI Advisor</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.chatContainer}
        contentContainerStyle={styles.chatContent}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map(msg => (
          <View
            key={msg.id}
            style={[
              styles.messageWrapper,
              msg.sender === "user" ? styles.userWrapper : styles.aiWrapper,
            ]}
          >
            {msg.sender === "ai" && (
              <View style={styles.aiIcon}>
                <Ionicons name="sparkles" size={16} color="#000" />
              </View>
            )}
            <View
              style={[
                styles.messageBubble,
                msg.sender === "user" ? styles.userBubble : styles.aiBubble,
              ]}
            >
              <Text style={styles.messageText}>{msg.text}</Text>
            </View>
          </View>
        ))}
        {loading && (
          <View style={styles.aiWrapper}>
            <View style={styles.aiIcon}>
              <Ionicons name="sparkles" size={16} color="#000" />
            </View>
            <View style={[styles.messageBubble, styles.aiBubble]}>
              <ActivityIndicator color={GOLD} size="small" />
            </View>
          </View>
        )}
      </ScrollView>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 20 : 0}
      >
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Ask about redemptions, rules..."
            placeholderTextColor="#666"
            value={input}
            onChangeText={setInput}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendBtn, !input.trim() && { opacity: 0.5 }]}
            onPress={handleSend}
            disabled={!input.trim() || loading}
          >
            <Ionicons name="send" size={20} color="#000" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#1a1a1a",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },
  headerSubtitle: {
    color: "#aaa",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  chatContainer: {
    flex: 1,
  },
  chatContent: {
    padding: 20,
    paddingBottom: 40,
  },
  messageWrapper: {
    flexDirection: "row",
    marginBottom: 20,
    maxWidth: "85%",
  },
  userWrapper: {
    alignSelf: "flex-end",
    justifyContent: "flex-end",
  },
  aiWrapper: {
    alignSelf: "flex-start",
    justifyContent: "flex-start",
  },
  aiIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: GOLD,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    marginTop: 5,
  },
  messageBubble: {
    padding: 14,
    borderRadius: 20,
  },
  userBubble: {
    backgroundColor: GOLD,
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: "#1a1a1a",
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: "#333",
  },
  messageText: {
    color: "#fff",
    fontSize: 15,
    lineHeight: 22,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#0d0d0d",
    borderTopWidth: 1,
    borderTopColor: "#222",
  },
  input: {
    flex: 1,
    backgroundColor: "#1a1a1a",
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    color: "#fff",
    fontSize: 15,
    maxHeight: 120,
    marginRight: 10,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: GOLD,
    justifyContent: "center",
    alignItems: "center",
  },
});
