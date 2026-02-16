import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Platform,
  TextInput,
  RefreshControl,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";
import Colors from "@/constants/colors";
import { useApp } from "@/lib/app-context";
import { LenderProfile } from "@/lib/types";

function StatCard({ icon, iconColor, iconBg, label, value, delay }: {
  icon: React.ReactNode;
  iconColor: string;
  iconBg: string;
  label: string;
  value: string;
  delay: number;
}) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(400)} style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: iconBg }]}>
        {icon}
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Animated.View>
  );
}

function LenderCard({ lender, index }: { lender: LenderProfile; index: number }) {
  const handlePress = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: "/lender/[id]", params: { id: lender.id } });
  };

  return (
    <Animated.View entering={FadeInDown.delay(200 + index * 80).duration(400)}>
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [styles.lenderCard, pressed && styles.lenderCardPressed]}
      >
        <View style={styles.lenderCardTop}>
          <View style={[styles.avatar, { backgroundColor: lender.avatarColor }]}>
            <Text style={styles.avatarText}>{lender.name.split(" ").map(n => n[0]).join("").toUpperCase()}</Text>
          </View>
          <View style={styles.lenderInfo}>
            <View style={styles.lenderNameRow}>
              <Text style={styles.lenderName}>{lender.name}</Text>
              {lender.verified && (
                <MaterialCommunityIcons name="check-decagram" size={16} color={Colors.primary} />
              )}
            </View>
          </View>
          <View style={styles.rateContainer}>
            <Text style={styles.rateValue}>{lender.interestRate}%</Text>
            <Text style={styles.rateLabel}>interest</Text>
          </View>
        </View>

        <View style={styles.lenderCardBottom}>
          <View style={styles.lenderTag}>
            <Feather name="dollar-sign" size={12} color={Colors.textSecondary} />
            <Text style={styles.lenderTagText}>${lender.minLoan} - ${lender.maxLoan}</Text>
          </View>
          <View style={styles.lenderTag}>
            <Feather name="clock" size={12} color={Colors.textSecondary} />
            <Text style={styles.lenderTagText}>{lender.repaymentDays} days</Text>
          </View>
          <View style={styles.lenderTag}>
            <Feather name="zap" size={12} color={Colors.textSecondary} />
            <Text style={styles.lenderTagText}>{lender.responseTime}</Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

function BorrowerHome() {
  const { lenders } = useApp();
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"rate" | "amount">("rate");
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const filteredLenders = lenders
    .filter(l => l.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === "rate") return a.interestRate - b.interestRate;
      return b.maxLoan - a.maxLoan;
    });

  return (
    <View style={styles.container}>
      <View style={[styles.headerSection, { paddingTop: insets.top + 12 + webTopInset }]}>
        <Text style={styles.headerTitle}>Find a Lender</Text>
        <Text style={styles.headerSubtitle}>
          {lenders.length} verified lenders available
        </Text>

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color={Colors.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search lenders..."
            placeholderTextColor={Colors.textTertiary}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={18} color={Colors.textTertiary} />
            </Pressable>
          )}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sortRow}>
          {([
            { key: "rate" as const, label: "Lowest Rate", icon: "trending-down" as const },
            { key: "amount" as const, label: "Highest Amount", icon: "cash-outline" as const },
          ]).map(item => (
            <Pressable
              key={item.key}
              onPress={() => setSortBy(item.key)}
              style={[
                styles.sortChip,
                sortBy === item.key && styles.sortChipActive,
              ]}
            >
              <Ionicons
                name={item.icon}
                size={14}
                color={sortBy === item.key ? "#FFFFFF" : Colors.textSecondary}
              />
              <Text style={[
                styles.sortChipText,
                sortBy === item.key && styles.sortChipTextActive,
              ]}>
                {item.label}
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
        {filteredLenders.map((lender, i) => (
          <LenderCard key={lender.id} lender={lender} index={i} />
        ))}
        {filteredLenders.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={48} color={Colors.textTertiary} />
            <Text style={styles.emptyTitle}>No lenders found</Text>
            <Text style={styles.emptyText}>Try adjusting your search</Text>
          </View>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

function LenderDashboard() {
  const { user, loans } = useApp();
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const activeLoans = loans.filter(l => l.status === "active");
  const pendingRequests = loans.filter(l => l.status === "pending");
  const completedLoans = loans.filter(l => l.status === "completed");
  const totalEarned = completedLoans.reduce((sum, l) => sum + (l.totalRepayment - l.amount), 0);
  const totalLent = activeLoans.reduce((sum, l) => sum + l.amount, 0);

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        <View style={[styles.dashHeader, { paddingTop: insets.top + 12 + webTopInset }]}>
          <Text style={styles.dashGreeting}>Welcome back,</Text>
          <Text style={styles.dashName}>{user?.name || "Lender"}</Text>
        </View>

        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Wallet Balance</Text>
          <Text style={styles.balanceAmount}>
            ${(user?.walletBalance || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </Text>
          <View style={styles.balanceDivider} />
          <View style={styles.balanceRow}>
            <View style={styles.balanceStat}>
              <Text style={styles.balanceStatValue}>${totalLent.toLocaleString()}</Text>
              <Text style={styles.balanceStatLabel}>Currently Lent</Text>
            </View>
            <View style={styles.balanceStatDivider} />
            <View style={styles.balanceStat}>
              <Text style={[styles.balanceStatValue, { color: Colors.success }]}>
                +${totalEarned.toFixed(2)}
              </Text>
              <Text style={styles.balanceStatLabel}>Interest Earned</Text>
            </View>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <StatCard
            icon={<Ionicons name="time-outline" size={22} color={Colors.accent} />}
            iconColor={Colors.accent}
            iconBg={Colors.accentLight}
            label="Pending"
            value={String(pendingRequests.length)}
            delay={100}
          />
          <StatCard
            icon={<Ionicons name="checkmark-circle-outline" size={22} color={Colors.success} />}
            iconColor={Colors.success}
            iconBg={Colors.successLight}
            label="Active"
            value={String(activeLoans.length)}
            delay={200}
          />
          <StatCard
            icon={<MaterialCommunityIcons name="check-all" size={22} color={Colors.info} />}
            iconColor={Colors.info}
            iconBg={Colors.infoLight}
            label="Completed"
            value={String(completedLoans.length)}
            delay={300}
          />
        </View>

        {pendingRequests.length > 0 && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Pending Requests</Text>
              <Pressable onPress={() => router.push("/(tabs)/loans")}>
                <Text style={styles.seeAll}>See all</Text>
              </Pressable>
            </View>
            {pendingRequests.slice(0, 2).map((loan) => (
              <Pressable
                key={loan.id}
                onPress={() => router.push({ pathname: "/loan/[id]", params: { id: loan.id } })}
                style={({ pressed }) => [styles.requestCard, pressed && { opacity: 0.8 }]}
              >
                <View style={styles.requestLeft}>
                  <View style={[styles.requestAvatar, { backgroundColor: Colors.warningLight }]}>
                    <Ionicons name="person" size={18} color={Colors.warning} />
                  </View>
                  <View>
                    <Text style={styles.requestName}>{loan.borrowerName}</Text>
                    <Text style={styles.requestPurpose}>{loan.purpose}</Text>
                  </View>
                </View>
                <View style={styles.requestRight}>
                  <Text style={styles.requestAmount}>${loan.amount}</Text>
                  <Text style={styles.requestDays}>{loan.repaymentDays}d</Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}

        {activeLoans.length > 0 && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Active Loans</Text>
            </View>
            {activeLoans.map((loan) => {
              const progress = loan.totalRepayment > 0 ? loan.amountPaid / loan.totalRepayment : 0;
              return (
                <Pressable
                  key={loan.id}
                  onPress={() => router.push({ pathname: "/loan/[id]", params: { id: loan.id } })}
                  style={({ pressed }) => [styles.requestCard, pressed && { opacity: 0.8 }]}
                >
                  <View style={styles.requestLeft}>
                    <View style={[styles.requestAvatar, { backgroundColor: Colors.successLight }]}>
                      <Ionicons name="person" size={18} color={Colors.success} />
                    </View>
                    <View>
                      <Text style={styles.requestName}>{loan.borrowerName}</Text>
                      <View style={styles.progressBarContainer}>
                        <View style={styles.progressBar}>
                          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
                        </View>
                        <Text style={styles.progressText}>{Math.round(progress * 100)}%</Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.requestRight}>
                    <Text style={styles.requestAmount}>${loan.amount}</Text>
                    <Text style={styles.requestDays}>due {loan.dueDate}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

export default function HomeTab() {
  const { role } = useApp();
  if (role === "lender") return <LenderDashboard />;
  return <BorrowerHome />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerSection: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: "DMSans_700Bold",
    color: Colors.text,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: "DMSans_400Regular",
    color: Colors.textSecondary,
    marginTop: 4,
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "DMSans_400Regular",
    color: Colors.text,
  },
  sortRow: {
    marginTop: 12,
    flexDirection: "row",
  },
  sortChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.background,
    marginRight: 8,
    gap: 6,
  },
  sortChipActive: {
    backgroundColor: Colors.primary,
  },
  sortChipText: {
    fontSize: 13,
    fontFamily: "DMSans_500Medium",
    color: Colors.textSecondary,
  },
  sortChipTextActive: {
    color: "#FFFFFF",
  },
  scrollContent: {
    padding: 20,
    gap: 12,
  },
  lenderCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  lenderCardPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  lenderCardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 16,
    fontFamily: "DMSans_700Bold",
    color: "#FFFFFF",
  },
  lenderInfo: {
    flex: 1,
  },
  lenderNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  lenderName: {
    fontSize: 16,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.text,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  ratingText: {
    fontSize: 13,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.text,
  },
  reviewCount: {
    fontSize: 12,
    fontFamily: "DMSans_400Regular",
    color: Colors.textTertiary,
  },
  rateContainer: {
    alignItems: "flex-end",
  },
  rateValue: {
    fontSize: 20,
    fontFamily: "DMSans_700Bold",
    color: Colors.primary,
  },
  rateLabel: {
    fontSize: 11,
    fontFamily: "DMSans_400Regular",
    color: Colors.textTertiary,
  },
  lenderCardBottom: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  lenderTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.background,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  lenderTagText: {
    fontSize: 12,
    fontFamily: "DMSans_500Medium",
    color: Colors.textSecondary,
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
  },
  dashHeader: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  dashGreeting: {
    fontSize: 16,
    fontFamily: "DMSans_400Regular",
    color: Colors.textSecondary,
  },
  dashName: {
    fontSize: 28,
    fontFamily: "DMSans_700Bold",
    color: Colors.text,
  },
  balanceCard: {
    marginHorizontal: 20,
    backgroundColor: Colors.primary,
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
  },
  balanceLabel: {
    fontSize: 14,
    fontFamily: "DMSans_500Medium",
    color: "rgba(255,255,255,0.7)",
  },
  balanceAmount: {
    fontSize: 36,
    fontFamily: "DMSans_700Bold",
    color: "#FFFFFF",
    marginTop: 4,
  },
  balanceDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.2)",
    marginVertical: 16,
  },
  balanceRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  balanceStat: {
    flex: 1,
  },
  balanceStatDivider: {
    width: 1,
    height: 32,
    backgroundColor: "rgba(255,255,255,0.2)",
    marginHorizontal: 16,
  },
  balanceStatValue: {
    fontSize: 16,
    fontFamily: "DMSans_700Bold",
    color: "#FFFFFF",
  },
  balanceStatLabel: {
    fontSize: 12,
    fontFamily: "DMSans_400Regular",
    color: "rgba(255,255,255,0.6)",
    marginTop: 2,
  },
  statsGrid: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  statIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  statValue: {
    fontSize: 22,
    fontFamily: "DMSans_700Bold",
    color: Colors.text,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: "DMSans_400Regular",
    color: Colors.textSecondary,
    marginTop: 2,
  },
  sectionContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.text,
  },
  seeAll: {
    fontSize: 14,
    fontFamily: "DMSans_500Medium",
    color: Colors.primary,
  },
  requestCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  requestLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  requestAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  requestName: {
    fontSize: 15,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.text,
  },
  requestPurpose: {
    fontSize: 13,
    fontFamily: "DMSans_400Regular",
    color: Colors.textSecondary,
    marginTop: 2,
  },
  requestRight: {
    alignItems: "flex-end",
  },
  requestAmount: {
    fontSize: 16,
    fontFamily: "DMSans_700Bold",
    color: Colors.text,
  },
  requestDays: {
    fontSize: 12,
    fontFamily: "DMSans_400Regular",
    color: Colors.textTertiary,
    marginTop: 2,
  },
  progressBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  progressBar: {
    width: 80,
    height: 4,
    backgroundColor: Colors.background,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: Colors.success,
    borderRadius: 2,
  },
  progressText: {
    fontSize: 11,
    fontFamily: "DMSans_500Medium",
    color: Colors.textSecondary,
  },
});
