import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, StyleSheet, Platform, StatusBar } from "react-native";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase/firebaseConfig"; 
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import "react-native-reanimated";
import "react-native-gesture-handler";




export default function Index() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Go to tab layout → home page
        router.replace("/tabs/HomeScreen");
      } else {
        // Go to Auth folder → login/signup screen
        router.replace("/Auth/AuthScreen");
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [router]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <ActivityIndicator size="large" color="#a87c5f" />
        </View>
      </SafeAreaView>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#000",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
