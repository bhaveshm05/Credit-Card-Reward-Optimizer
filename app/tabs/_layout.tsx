// CCRO/app/tabs/_layout.tsx
import React from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import "react-native-gesture-handler";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#a87c5f",
        tabBarInactiveTintColor: "gray",
        tabBarStyle: {
          backgroundColor: "#111",
          borderTopWidth: 0.5,
          borderTopColor: "#333",
          height: 60,
          paddingBottom: 5,
        },
      }}
    >
      {/* 🏠 Home */}
      <Tabs.Screen
        name="HomeScreen"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" color={color} size={size} />
          ),
        }}
      />


      {/* 💳 Cards */}
      <Tabs.Screen
        name="AddRewardCardScreen"
        options={{
          title: "Cards",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="card-outline" color={color} size={size} />
          ),
        }}
      />

      {/* 🎁 Rewards */}
<Tabs.Screen
  name="RewardsScreen"
  options={{
    title: "Rewards",
    tabBarIcon: ({ color, size }) => (
      <Ionicons name="gift-outline" color={color} size={size} />
    ),
  }}
/>

      {/* 📊 Analysis */}
      <Tabs.Screen
        name="AnalysisScreen"
        options={{
          title: "Analysis",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="analytics-outline" color={color} size={size} />
          ),
        }}
      />

      
    </Tabs>
  );
}
