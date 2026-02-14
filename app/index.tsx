import React, { useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import Colors from "@/constants/colors";
import { useApp } from "@/lib/app-context";
import { UserRole } from "@/lib/types";

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const { role, setRole, isLoading } = useApp();

  useEffect(() => {
    if (!isLoading && role) {
      router.replace("/(tabs)");
    }
  }, [isLoading, role]);

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: Colors.background }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (role) return null;

  const handleSelectRole = async (selectedRole: UserRole) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    await setRole(selectedRole);
    router.replace("/(tabs)");
  };

  const webTopInset = Platform.OS === "web" ? 67 : 0;

  return (
    <LinearGradient
      colors={["#0F1B2D", "#0D3B30", "#0F1B2D"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <View style={{ paddingTop: insets.top + webTopInset }}>
        <Animated.View entering={FadeInUp.delay(200).duration(600)} style={styles.header}>
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <MaterialCommunityIcons name="handshake" size={32} color="#FFFFFF" />
            </View>
          </View>
          <Text style={styles.brandName}>LendLink</Text>
          <Text style={styles.tagline}>Peer-to-peer microloans,{"\n"}simplified.</Text>
        </Animated.View>
      </View>

      <View style={styles.cardsContainer}>
        <Animated.View entering={FadeInDown.delay(400).duration(600)}>
          <Pressable
            onPress={() => handleSelectRole("borrower")}
            style={({ pressed }) => [
              styles.roleCard,
              pressed && styles.roleCardPressed,
            ]}
          >
            <LinearGradient
              colors={["#FFFFFF", "#F0FAF7"]}
              style={styles.roleCardGradient}
            >
              <View style={[styles.roleIconContainer, { backgroundColor: Colors.primaryLight }]}>
                <Ionicons name="wallet-outline" size={28} color={Colors.primary} />
              </View>
              <View style={styles.roleTextContainer}>
                <Text style={styles.roleTitle}>I need a loan</Text>
                <Text style={styles.roleDescription}>
                  Browse verified lenders, compare rates, and get funded quickly
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={22} color={Colors.textTertiary} />
            </LinearGradient>
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(550).duration(600)}>
          <Pressable
            onPress={() => handleSelectRole("lender")}
            style={({ pressed }) => [
              styles.roleCard,
              pressed && styles.roleCardPressed,
            ]}
          >
            <LinearGradient
              colors={["#FFFFFF", "#FFF9F0"]}
              style={styles.roleCardGradient}
            >
              <View style={[styles.roleIconContainer, { backgroundColor: Colors.accentLight }]}>
                <MaterialCommunityIcons name="cash-multiple" size={28} color={Colors.accent} />
              </View>
              <View style={styles.roleTextContainer}>
                <Text style={styles.roleTitle}>I want to lend</Text>
                <Text style={styles.roleDescription}>
                  Set your terms, earn interest, and help borrowers in need
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={22} color={Colors.textTertiary} />
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </View>

      <Animated.View entering={FadeInDown.delay(700).duration(600)}>
        <Text style={[styles.footer, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 16) }]}>
          Secure, transparent, and fast
        </Text>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-between",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 24,
  },
  logoContainer: {
    marginBottom: 20,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  brandName: {
    fontSize: 36,
    fontFamily: "DMSans_700Bold",
    color: "#FFFFFF",
    marginBottom: 12,
  },
  tagline: {
    fontSize: 18,
    fontFamily: "DMSans_400Regular",
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
    lineHeight: 26,
  },
  cardsContainer: {
    paddingHorizontal: 20,
    gap: 16,
  },
  roleCard: {
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  roleCardPressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.9,
  },
  roleCardGradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    gap: 16,
  },
  roleIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  roleTextContainer: {
    flex: 1,
  },
  roleTitle: {
    fontSize: 18,
    fontFamily: "DMSans_700Bold",
    color: Colors.text,
    marginBottom: 4,
  },
  roleDescription: {
    fontSize: 13,
    fontFamily: "DMSans_400Regular",
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  footer: {
    textAlign: "center",
    color: "rgba(255,255,255,0.4)",
    fontFamily: "DMSans_500Medium",
    fontSize: 13,
    paddingVertical: 16,
  },
});
