import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  ScrollView,
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

type AuthMode = "choose" | "login" | "register";

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const { isAuthenticated, isLoading, login, register, authError, clearAuthError } = useApp();
  const [mode, setMode] = useState<AuthMode>("choose");
  const [role, setRole] = useState<UserRole>("borrower");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/(tabs)");
    }
  }, [isLoading, isAuthenticated]);

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: Colors.background }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (isAuthenticated) return null;

  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) return;
    setSubmitting(true);
    try {
      await login(username.trim(), password.trim());
      router.replace("/(tabs)");
    } catch {}
    setSubmitting(false);
  };

  const handleRegister = async () => {
    if (!username.trim() || !password.trim() || !name.trim() || !email.trim()) return;
    setSubmitting(true);
    try {
      await register({
        username: username.trim(),
        password: password.trim(),
        name: name.trim(),
        email: email.trim(),
        role,
      });
      router.replace("/(tabs)");
    } catch {}
    setSubmitting(false);
  };

  const resetForm = () => {
    setUsername("");
    setPassword("");
    setName("");
    setEmail("");
    clearAuthError();
  };

  if (mode === "login" || mode === "register") {
    const isRegister = mode === "register";
    return (
      <LinearGradient
        colors={["#0F1B2D", "#0D3B30", "#0F1B2D"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            contentContainerStyle={[styles.authContainer, { paddingTop: insets.top + webTopInset + 20 }]}
            keyboardShouldPersistTaps="handled"
          >
            <Pressable onPress={() => { setMode("choose"); resetForm(); }} style={styles.backButton}>
              <Ionicons name="chevron-back" size={24} color="rgba(255,255,255,0.7)" />
            </Pressable>

            <View style={styles.authHeader}>
              <View style={styles.logoCircle}>
                <MaterialCommunityIcons name="handshake" size={28} color="#FFFFFF" />
              </View>
              <Text style={styles.authTitle}>
                {isRegister ? "Create Account" : "Welcome Back"}
              </Text>
            </View>

            {isRegister && (
              <View style={styles.roleToggle}>
                <Pressable
                  onPress={() => setRole("borrower")}
                  style={[styles.roleBtn, role === "borrower" && styles.roleBtnActive]}
                >
                  <Ionicons name="wallet-outline" size={16} color={role === "borrower" ? "#FFFFFF" : "rgba(255,255,255,0.5)"} />
                  <Text style={[styles.roleBtnText, role === "borrower" && styles.roleBtnTextActive]}>Borrower</Text>
                </Pressable>
                <Pressable
                  onPress={() => setRole("lender")}
                  style={[styles.roleBtn, role === "lender" && styles.roleBtnActive]}
                >
                  <MaterialCommunityIcons name="cash-multiple" size={16} color={role === "lender" ? "#FFFFFF" : "rgba(255,255,255,0.5)"} />
                  <Text style={[styles.roleBtnText, role === "lender" && styles.roleBtnTextActive]}>Lender</Text>
                </Pressable>
              </View>
            )}

            {isRegister && (
              <>
                <View style={styles.inputContainer}>
                  <Ionicons name="person-outline" size={18} color="rgba(255,255,255,0.4)" />
                  <TextInput
                    style={styles.input}
                    placeholder="Full Name"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                  />
                </View>
                <View style={styles.inputContainer}>
                  <Ionicons name="mail-outline" size={18} color="rgba(255,255,255,0.4)" />
                  <TextInput
                    style={styles.input}
                    placeholder="Email"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </>
            )}

            <View style={styles.inputContainer}>
              <Ionicons name="at" size={18} color="rgba(255,255,255,0.4)" />
              <TextInput
                style={styles.input}
                placeholder="Username"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={18} color="rgba(255,255,255,0.4)" />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            {authError && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={16} color={Colors.error} />
                <Text style={styles.errorText}>{authError}</Text>
              </View>
            )}

            <Pressable
              onPress={isRegister ? handleRegister : handleLogin}
              disabled={submitting}
              style={({ pressed }) => [
                styles.submitButton,
                pressed && { opacity: 0.9 },
                submitting && { opacity: 0.5 },
              ]}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {isRegister ? "Sign Up" : "Log In"}
                </Text>
              )}
            </Pressable>

            <Pressable onPress={() => { setMode(isRegister ? "login" : "register"); resetForm(); }}>
              <Text style={styles.switchText}>
                {isRegister ? "Already have an account? Log In" : "Don't have an account? Sign Up"}
              </Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    );
  }

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
            onPress={() => { setMode("register"); setRole("borrower"); }}
            style={({ pressed }) => [styles.roleCard, pressed && styles.roleCardPressed]}
          >
            <LinearGradient colors={["#FFFFFF", "#F0FAF7"]} style={styles.roleCardGradient}>
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
            onPress={() => { setMode("register"); setRole("lender"); }}
            style={({ pressed }) => [styles.roleCard, pressed && styles.roleCardPressed]}
          >
            <LinearGradient colors={["#FFFFFF", "#FFF9F0"]} style={styles.roleCardGradient}>
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
        <Pressable onPress={() => setMode("login")}>
          <Text style={styles.loginLink}>Already have an account? Log In</Text>
        </Pressable>
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
  loginLink: {
    textAlign: "center",
    color: "rgba(255,255,255,0.7)",
    fontFamily: "DMSans_500Medium",
    fontSize: 14,
    paddingVertical: 12,
  },
  footer: {
    textAlign: "center",
    color: "rgba(255,255,255,0.4)",
    fontFamily: "DMSans_500Medium",
    fontSize: 13,
    paddingVertical: 8,
  },
  authContainer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
  },
  authHeader: {
    alignItems: "center",
    marginBottom: 32,
  },
  authTitle: {
    fontSize: 24,
    fontFamily: "DMSans_700Bold",
    color: "#FFFFFF",
    marginTop: 16,
  },
  roleToggle: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
  },
  roleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
  },
  roleBtnActive: {
    backgroundColor: Colors.primary,
  },
  roleBtnText: {
    fontSize: 14,
    fontFamily: "DMSans_600SemiBold",
    color: "rgba(255,255,255,0.5)",
  },
  roleBtnTextActive: {
    color: "#FFFFFF",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: "DMSans_400Regular",
    color: "#FFFFFF",
    paddingVertical: 16,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.errorLight,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 13,
    fontFamily: "DMSans_500Medium",
    color: Colors.error,
    flex: 1,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 16,
  },
  submitButtonText: {
    fontSize: 16,
    fontFamily: "DMSans_700Bold",
    color: "#FFFFFF",
  },
  switchText: {
    textAlign: "center",
    color: "rgba(255,255,255,0.6)",
    fontFamily: "DMSans_500Medium",
    fontSize: 14,
  },
});
