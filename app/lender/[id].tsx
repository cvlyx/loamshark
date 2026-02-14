import React from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Platform,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import Colors from "@/constants/colors";
import { useApp } from "@/lib/app-context";

export default function LenderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { lenders } = useApp();
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const lender = lenders.find(l => l.id === id);

  if (!lender) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Lender not found</Text>
      </View>
    );
  }

  const handleApply = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({ pathname: "/apply/[id]", params: { id: lender.id } });
  };

  return (
    <View style={styles.container}>
      <View style={[styles.backRow, { paddingTop: insets.top + 8 + webTopInset }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInUp.duration(400)} style={styles.profileSection}>
          <View style={[styles.avatar, { backgroundColor: lender.avatarColor }]}>
            <Text style={styles.avatarText}>{lender.initials}</Text>
          </View>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{lender.name}</Text>
            {lender.verified && (
              <MaterialCommunityIcons name="check-decagram" size={20} color={Colors.primary} />
            )}
          </View>
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={16} color={Colors.accent} />
            <Text style={styles.rating}>{lender.rating}</Text>
            <Text style={styles.reviews}>({lender.reviewCount} reviews)</Text>
          </View>
          <Text style={styles.description}>{lender.description}</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.termsCard}>
          <Text style={styles.termsTitle}>Loan Terms</Text>
          <View style={styles.termsGrid}>
            <View style={styles.termItem}>
              <View style={[styles.termIcon, { backgroundColor: Colors.primaryLight }]}>
                <Feather name="percent" size={18} color={Colors.primary} />
              </View>
              <Text style={styles.termValue}>{lender.interestRate}%</Text>
              <Text style={styles.termLabel}>Interest Rate</Text>
            </View>
            <View style={styles.termItem}>
              <View style={[styles.termIcon, { backgroundColor: Colors.accentLight }]}>
                <Feather name="dollar-sign" size={18} color={Colors.accent} />
              </View>
              <Text style={styles.termValue}>${lender.minLoan}</Text>
              <Text style={styles.termLabel}>Minimum</Text>
            </View>
            <View style={styles.termItem}>
              <View style={[styles.termIcon, { backgroundColor: Colors.infoLight }]}>
                <Feather name="dollar-sign" size={18} color={Colors.info} />
              </View>
              <Text style={styles.termValue}>${lender.maxLoan.toLocaleString()}</Text>
              <Text style={styles.termLabel}>Maximum</Text>
            </View>
            <View style={styles.termItem}>
              <View style={[styles.termIcon, { backgroundColor: Colors.successLight }]}>
                <Feather name="clock" size={18} color={Colors.success} />
              </View>
              <Text style={styles.termValue}>{lender.repaymentDays}d</Text>
              <Text style={styles.termLabel}>Repayment</Text>
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300).duration(400)} style={styles.statsCard}>
          <Text style={styles.termsTitle}>Track Record</Text>
          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <Ionicons name="checkmark-done" size={20} color={Colors.success} />
              <View>
                <Text style={styles.statValue}>{lender.totalLoansGiven}</Text>
                <Text style={styles.statLabel}>Loans Given</Text>
              </View>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="cash-outline" size={20} color={Colors.primary} />
              <View>
                <Text style={styles.statValue}>
                  ${(lender.totalAmountLent / 1000).toFixed(0)}K
                </Text>
                <Text style={styles.statLabel}>Total Lent</Text>
              </View>
            </View>
          </View>
          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <Ionicons name="flash-outline" size={20} color={Colors.accent} />
              <View>
                <Text style={styles.statValue}>{lender.responseTime}</Text>
                <Text style={styles.statLabel}>Avg. Response</Text>
              </View>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="calendar-outline" size={20} color={Colors.info} />
              <View>
                <Text style={styles.statValue}>
                  {new Date(lender.joinDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                </Text>
                <Text style={styles.statLabel}>Joined</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        <View style={{ height: 120 }} />
      </ScrollView>

      <View style={[styles.applyBar, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 16) }]}>
        <View style={styles.applyInfo}>
          <Text style={styles.applyRate}>{lender.interestRate}% interest</Text>
          <Text style={styles.applyRange}>
            ${lender.minLoan} - ${lender.maxLoan.toLocaleString()}
          </Text>
        </View>
        <Pressable
          onPress={handleApply}
          style={({ pressed }) => [styles.applyBtn, pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] }]}
        >
          <Text style={styles.applyBtnText}>Apply Now</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  errorText: {
    fontSize: 16,
    fontFamily: "DMSans_500Medium",
    color: Colors.textSecondary,
    textAlign: "center",
    marginTop: 100,
  },
  backRow: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: Colors.surface,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  profileSection: {
    backgroundColor: Colors.surface,
    alignItems: "center",
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 28,
    fontFamily: "DMSans_700Bold",
    color: "#FFFFFF",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  name: {
    fontSize: 24,
    fontFamily: "DMSans_700Bold",
    color: Colors.text,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  rating: {
    fontSize: 16,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.text,
  },
  reviews: {
    fontSize: 14,
    fontFamily: "DMSans_400Regular",
    color: Colors.textTertiary,
  },
  description: {
    fontSize: 15,
    fontFamily: "DMSans_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  termsCard: {
    margin: 20,
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  termsTitle: {
    fontSize: 17,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.text,
    marginBottom: 16,
  },
  termsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  termItem: {
    width: "47%",
    backgroundColor: Colors.background,
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    gap: 6,
  },
  termIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  termValue: {
    fontSize: 18,
    fontFamily: "DMSans_700Bold",
    color: Colors.text,
  },
  termLabel: {
    fontSize: 12,
    fontFamily: "DMSans_400Regular",
    color: Colors.textTertiary,
  },
  statsCard: {
    marginHorizontal: 20,
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  statRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  statItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 12,
  },
  statValue: {
    fontSize: 15,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.text,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: "DMSans_400Regular",
    color: Colors.textTertiary,
  },
  applyBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.surface,
    paddingTop: 14,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
  },
  applyInfo: {},
  applyRate: {
    fontSize: 16,
    fontFamily: "DMSans_700Bold",
    color: Colors.text,
  },
  applyRange: {
    fontSize: 13,
    fontFamily: "DMSans_400Regular",
    color: Colors.textSecondary,
    marginTop: 2,
  },
  applyBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
  },
  applyBtnText: {
    fontSize: 16,
    fontFamily: "DMSans_700Bold",
    color: "#FFFFFF",
  },
});
