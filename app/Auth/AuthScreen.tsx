
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { auth } from "../../firebase/firebaseConfig";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
} from "firebase/auth";

const GOLD = "#a87c5f";
const SUCCESS_COLOR = "#a87c5f";
const ERROR_COLOR = "#a87c5f";

interface Message {
  text: string;
  type: "success" | "error";
}

const AuthScreen: React.FC = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);

  const cardFadeAnim = React.useRef(new Animated.Value(0)).current;
  const messageSlideAnim = React.useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    Animated.timing(cardFadeAnim, {
      toValue: 1,
      duration: 600,
      easing: Easing.ease,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    if (message) {
      Animated.sequence([
        Animated.timing(messageSlideAnim, {
          toValue: 0,
          duration: 300,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.delay(3000),
        Animated.timing(messageSlideAnim, {
          toValue: -100,
          duration: 300,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start(() => {
        setMessage(null);
        messageSlideAnim.setValue(-100);
      });
    }
  }, [message]);

  const showMessage = (text: string, type: "success" | "error") => {
    setMessage({ text, type });
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      showMessage("Please enter your email to reset password.", "error");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      showMessage("Enter a valid email address.", "error");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      showMessage("Password reset email sent! Check your inbox.", "success");
    } catch (err: any) {
      const friendlyMessage = err?.code
        ? err.code.replace("auth/", "").replace(/-/g, " ").toUpperCase()
        : "Failed to send reset link. Try again.";
      showMessage(friendlyMessage, "error");
    }
  };

  const handleAuth = async () => {
    if (!email.trim() || !password.trim()) {
      showMessage("Please fill all fields.", "error");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      showMessage("Enter a valid email address.", "error");
      return;
    }
    if (password.length <= 8) {
      showMessage("Password must be at least 8 characters.", "error");
      return;
    }
    if (!isLogin && password !== confirmPassword) {
      showMessage("Passwords do not match.", "error");
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        const userCredential = await signInWithEmailAndPassword(
          auth,
          email,
          password
        );
        const user = userCredential.user;

        // BLOCK LOGIN UNTIL VERIFIED
        if (!user.emailVerified) {
          showMessage("Please verify your email before logging in.", "error");
          return;
        }

        showMessage("Login successful!", "success");
        router.replace("/tabs/HomeScreen");
      } else {
        // SIGNUP + SEND VERIFICATION LINK
        await createUserWithEmailAndPassword(auth, email, password);

        if (auth.currentUser) {
          await sendEmailVerification(auth.currentUser);
        }

        showMessage("Verification email sent! Check your inbox.", "success");

        setTimeout(() => {
          router.replace({
            pathname: "/Auth/VerifyEmailScreen",
            params: { email },
          });
        }, 1200);
      }
    } catch (err: any) {
      const friendlyMessage = err?.code
        ? err.code.replace("auth/", "").replace(/-/g, " ").toUpperCase()
        : "Authentication failed. Try again.";
      showMessage(friendlyMessage, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
    >
      {message && (
        <Animated.View
          style={[
            styles.messageBanner,
            {
              backgroundColor:
                message.type === "error" ? ERROR_COLOR : SUCCESS_COLOR,
              transform: [{ translateY: messageSlideAnim }],
              top: insets.top + 10,
            },
          ]}
        >
          <Text style={styles.messageText}>{message.text}</Text>
        </Animated.View>
      )}

      <Animated.View style={[styles.card, { opacity: cardFadeAnim }]}>
        <Text style={styles.title}>
          {isLogin ? "Welcome" : "Create Account"}
        </Text>
        <Text style={styles.subtitle}>
          {isLogin
            ? "Log in to your Reward Optimizer"
            : "Join and maximize your rewards"}
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={GOLD}
          value={email}
          keyboardType="email-address"
          onChangeText={setEmail}
          autoCapitalize="none"
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={GOLD}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {isLogin && (
          <TouchableOpacity onPress={handleForgotPassword}>
            <Text
              style={{
                color: GOLD,
                fontSize: 13,
                textAlign: "right",
                marginBottom: 10,
              }}
            >
              Forgot Password?
            </Text>
          </TouchableOpacity>
        )}

        {!isLogin && (
          <TextInput
            style={styles.input}
            placeholder="Confirm Password"
            placeholderTextColor={GOLD}
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
        )}

        <TouchableOpacity
          style={[styles.button, loading ? { opacity: 0.8 } : {}]}
          onPress={handleAuth}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <Text style={styles.buttonText}>
              {isLogin ? "Login" : "Sign Up"}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
          <Text style={styles.switchText}>
            {isLogin
              ? "Don’t have an account? Sign Up"
              : "Already have an account? Log In"}
          </Text>
        </TouchableOpacity>
      </Animated.View>

      <Text style={styles.footer}>© 2025 Credit Card Reward Optimizer</Text>
    </KeyboardAvoidingView>
  );
};

export default AuthScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  messageBanner: {
    position: "absolute",
    left: 0,
    right: 0,
    paddingVertical: 12,
    paddingHorizontal: 20,
    zIndex: 10,
  },
  messageText: {
    color: "#fff",
    fontWeight: "600",
    textAlign: "center",
  },
  card: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#111",
    borderRadius: 20,
    padding: 25,
    shadowColor: "#a87c5f",
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  title: {
    color: "#a87c5f",
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 6,
  },
  subtitle: {
    color: "#a87c5f",
    fontSize: 15,
    textAlign: "center",
    marginBottom: 25,
  },
  input: {
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    padding: 14,
    color: "#a87c5f",
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    marginBottom: 15,
    shadowColor: "#553e2fff",
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  button: {
    backgroundColor: "#a87c5f",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
    shadowColor: "#553e2fff",
    shadowOpacity: 0.6,
    shadowRadius: 10,
  },
  buttonText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "700",
  },
  switchText: {
    color: "#a87c5f",
    textAlign: "center",
    marginTop: 15,
    fontSize: 14,
  },
  footer: {
    position: "absolute",
    bottom: 25,
    color: "#a87c5f",
    fontSize: 12,
  },
});
