import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";
import Colors from "@/constants/colors";
import { useApp } from "@/lib/app-context";
import { LoanRequest } from "@/lib/types";

type FilterType = "all" | "pending" | "active" | "completed" | "declined";

function getStatusConfig(status: string) {
  switch (status) {
    case "pending":
      return { color: Colors.warning, bg: Colors.warningLight, label: "Pending" };
    case "approved":
      return { color: Colors.info, bg: Colors.infoLight, label: "Approved" };
    case "active":
      return { color: Colors.success, bg: Colors.successLight, label: "Active" };
    case "completed":
      return { color: Colors.primary, bg: Colors.primaryLight, label: "Completed" };
    case "declined":
      return { color: Colors.error, bg: Colors.errorLight, label: "Declined" };
    default:
      return { color: Colors.textSecondary, bg: Colors.background, label: status };
  }
}

function LoanCard({ loan, isLender, index }: { loan: LoanRequest; isLender: boolean; index: number }) {
  const status = getStatusConfig(loan.status);
  const progress = loan.totalRepayment > 0 ? loan.amountPaid / loan.totalRepayment : 0;

  return (
    <Animated.View entering={FadeInDown.delay(100 + index * 60).duration(400)}>
      <Pressable
        onPress={() => {
          if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push({ pathname: "/loan/[id]", params: { id: loan.id } });
        }}
        style={({ pressed }) => [styles.loanCard, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
      >
        <View style={styles.loanCardHeader}>
          <View style={styles.loanCardLeft}>
            <Text style={styles.loanPersonLabel}>{isLender ? "Borrower" : "Lender"}</Text>
            <Text style={styles.loanPersonName}>
              {isLender ? loan.borrowerName : loan.lenderName}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>

        <View style={styles.loanCardBody}>
          <View style={styles.loanDetail}>
            <Text style={styles.loanDetailLabel}>Amount</Text>
            <Text style={styles.loanDetailValue}>${loan.amount}</Text>
          </View>
          <View style={styles.loanDetail}>
            <Text style={styles.loanDetailLabel}>Rate</Text>
            <Text style={styles.loanDetailValue}>{loan.interestRate}%</Text>
          </View>
          <View style={styles.loanDetail}>
            <Text style={styles.loanDetailLabel}>Total Due</Text>
            <Text style={styles.loanDetailValue}>${loan.totalRepayment.toFixed(2)}</Text>
          </View>
        </View>

        {(loan.status === "active" || loan.status === "completed") && (
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Repayment Progress</Text>
              <Text style={styles.progressPercent}>{Math.round(progress * 100)}%</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${Math.min(progress * 100, 100)}%`,
                    backgroundColor: loan.status === "completed" ? Colors.primary : Colors.success,
                  },
                ]}
              />
            </View>
            <Text style={styles.progressAmounts}>
              ${loan.amountPaid.toFixed(2)} / ${loan.totalRepayment.toFixed(2)}
            </Text>
          </View>
        )}

        <View style={styles.loanCardFooter}>
          <View style={styles.footerItem}>
            <Ionicons name="calendar-outline" size={14} color={Colors.textTertiary} />
            <Text style={styles.footerText}>{loan.requestDate}</Text>
          </View>
          <View style={styles.footerItem}>
            <Ionicons name="document-text-outline" size={14} color={Colors.textTertiary} />
            <Text style={styles.footerText}>{loan.purpose}</Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function LoansTab() {
  const { role, loans } = useApp();
  const [filter, setFilter] = useState<FilterType>("all");
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const isLender = role === "lender";

  const filteredLoans = filter === "all" ? loans : loans.filter(l => l.status === filter);

  const filters: { key: FilterType; label: string }[] = [
    { key: "all", label: "All" },
    { key: "pending", label: "Pending" },
    { key: "active", label: "Active" },
    { key: "completed", label: "Done" },
  ];

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 + webTopInset }]}>
        <Text style={styles.title}>{isLender ? "Loan Requests" : "My Loans"}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          {filters.map(f => (
            <Pressable
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
            >
              <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
                {f.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        {filteredLoans.map((loan, i) => (
          <LoanCard key={loan.id} loan={loan} isLender={isLender} index={i} />
        ))}
        {filteredLoans.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={48} color={Colors.textTertiary} />
            <Text style={styles.emptyTitle}>No loans found</Text>
            <Text style={styles.emptyText}>
              {isLender
                ? "No loan requests match this filter"
                : "Browse lenders to apply for your first loan"}
            </Text>
          </View>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  title: {
    fontSize: 28,
    fontFamily: "DMSans_700Bold",
    color: Colors.text,
    marginBottom: 16,
  },
  filterRow: {
    flexDirection: "row",
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.background,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
  },
  filterText: {
    fontSize: 14,
    fontFamily: "DMSans_500Medium",
    color: Colors.textSecondary,
  },
  filterTextActive: {
    color: "#FFFFFF",
  },
  scrollContent: {
    padding: 20,
    gap: 12,
  },
  loanCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  loanCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  loanCardLeft: {},
  loanPersonLabel: {
    fontSize: 12,
    fontFamily: "DMSans_400Regular",
    color: Colors.textTertiary,
  },
  loanPersonName: {
    fontSize: 17,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.text,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontFamily: "DMSans_600SemiBold",
  },
  loanCardBody: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 16,
  },
  loanDetail: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 10,
    padding: 10,
    alignItems: "center",
  },
  loanDetailLabel: {
    fontSize: 11,
    fontFamily: "DMSans_400Regular",
    color: Colors.textTertiary,
  },
  loanDetailValue: {
    fontSize: 16,
    fontFamily: "DMSans_700Bold",
    color: Colors.text,
    marginTop: 2,
  },
  progressSection: {
    marginBottom: 12,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 13,
    fontFamily: "DMSans_500Medium",
    color: Colors.textSecondary,
  },
  progressPercent: {
    fontSize: 13,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.text,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: Colors.background,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  progressAmounts: {
    fontSize: 12,
    fontFamily: "DMSans_400Regular",
    color: Colors.textTertiary,
    marginTop: 4,
  },
  loanCardFooter: {
    flexDirection: "row",
    gap: 16,
  },
  footerItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  footerText: {
    fontSize: 12,
    fontFamily: "DMSans_400Regular",
    color: Colors.textTertiary,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.text,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "DMSans_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
    paddingHorizontal: 40,
  },
});
