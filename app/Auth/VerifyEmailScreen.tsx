import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { auth } from "../../firebase/firebaseConfig";
import { sendEmailVerification, reload } from "firebase/auth";

const GOLD = "#a87c5f";

export default function VerifyEmailScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams();
  const [resending, setResending] = useState(false);
  const fade = useRef(new Animated.Value(0)).current;

  // ⭐ Fade in animation
  useEffect(() => {
    Animated.timing(fade, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  // ⭐ Auto-check email verification every 3 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      if (auth.currentUser) {
        await reload(auth.currentUser); // refresh user
        if (auth.currentUser.emailVerified) {
          clearInterval(interval);

          // Wait 300ms for smoother UX
          setTimeout(() => {
            router.replace("/Auth/PersonalDetailsScreen");
          }, 300);
        }
      }
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // ⭐ Resend verification email
  const resendEmail = async () => {
    if (!auth.currentUser) return;
    setResending(true);

    try {
      await sendEmailVerification(auth.currentUser);
    } catch (err) {
      console.log("Resend failed:", err);
    }
    setResending(false);
  };

  return (
    <Animated.View style={[styles.container, { opacity: fade }]}>
      <Text style={styles.title}>Verify Your Email</Text>

      <Text style={styles.description}>
        A verification link has been sent to:
      </Text>

      <Text style={styles.email}>{email}</Text>

      <ActivityIndicator size="large" color={GOLD} style={{ marginTop: 20 }} />

      <Text style={styles.waitText}>
        Waiting for you to verify your email...
      </Text>

      <TouchableOpacity
        onPress={resendEmail}
        style={[styles.button, resending && { opacity: 0.5 }]}
        disabled={resending}
      >
        <Text style={styles.buttonText}>
          {resending ? "Resending..." : "Resend Verification Email"}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },
  title: {
    color: GOLD,
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 10,
  },
  description: {
    color: GOLD,
    fontSize: 16,
    textAlign: "center",
    marginTop: 5,
  },
  email: {
    color: GOLD,
    fontSize: 18,
    fontWeight: "600",
    marginTop: 8,
    textAlign: "center",
  },
  waitText: {
    color: GOLD,
    marginTop: 20,
    fontSize: 14,
  },
  button: {
    backgroundColor: GOLD,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 25,
  },
  buttonText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "700",
  },
});
