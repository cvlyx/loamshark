import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Platform,
  TextInput,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useApp } from "@/lib/app-context";

function SettingRow({ icon, label, value, onPress }: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.settingRow, pressed && onPress && { opacity: 0.7 }]}
    >
      <View style={styles.settingLeft}>
        {icon}
        <Text style={styles.settingLabel}>{label}</Text>
      </View>
      <View style={styles.settingRight}>
        {value && <Text style={styles.settingValue}>{value}</Text>}
        {onPress && <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />}
      </View>
    </Pressable>
  );
}

export default function ProfileTab() {
  const { user, role, updateProfile, logout, loans } = useApp();
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const isLender = role === "lender";
  const [editingRate, setEditingRate] = useState(false);
  const [rateInput, setRateInput] = useState(String(user?.interestRate || "5.0"));

  if (!user) return null;

  const totalLoans = loans.filter(l => l.status === "completed" || l.status === "active").length;

  const handleLogout = () => {
    if (Platform.OS === "web") {
      logout();
      router.replace("/");
    } else {
      Alert.alert("Switch Role", "This will reset your session. Continue?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Switch",
          style: "destructive",
          onPress: () => {
            logout();
            router.replace("/");
          },
        },
      ]);
    }
  };

  const handleSaveRate = () => {
    const rate = parseFloat(rateInput);
    if (!isNaN(rate) && rate > 0 && rate <= 50) {
      updateProfile({ interestRate: rate });
      setEditingRate(false);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        <View style={[styles.profileHeader, { paddingTop: insets.top + 20 + webTopInset }]}>
          <View style={[styles.profileAvatar, { backgroundColor: Colors.primary }]}>
            <Text style={styles.profileAvatarText}>
              {user.name.split(" ").map(n => n[0]).join("")}
            </Text>
          </View>
          <Text style={styles.profileName}>{user.name}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>
              {isLender ? "Lender" : "Borrower"}
            </Text>
            {user.verified && (
              <MaterialCommunityIcons name="check-decagram" size={14} color={Colors.primary} />
            )}
          </View>

          <View style={styles.profileStats}>
            <View style={styles.profileStat}>
              <Text style={styles.profileStatValue}>{totalLoans}</Text>
              <Text style={styles.profileStatLabel}>
                {isLender ? "Loans Given" : "Loans Taken"}
              </Text>
            </View>
            <View style={styles.profileStatDivider} />
            <View style={styles.profileStat}>
              <Text style={styles.profileStatValue}>
                {user.createdAt.slice(0, 7).replace("-", "/")}
              </Text>
              <Text style={styles.profileStatLabel}>Member Since</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.sectionCard}>
            <SettingRow
              icon={<Ionicons name="person-outline" size={20} color={Colors.primary} />}
              label="Full Name"
              value={user.name}
            />
            <View style={styles.settingDivider} />
            <SettingRow
              icon={<Ionicons name="mail-outline" size={20} color={Colors.primary} />}
              label="Email"
              value={user.email}
            />
            <View style={styles.settingDivider} />
            <SettingRow
              icon={<Ionicons name="call-outline" size={20} color={Colors.primary} />}
              label="Phone"
              value={user.phone}
            />
          </View>
        </View>

        {isLender && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Lending Settings</Text>
            <View style={styles.sectionCard}>
              {editingRate ? (
                <View style={styles.editRow}>
                  <View style={styles.settingLeft}>
                    <Feather name="percent" size={20} color={Colors.primary} />
                    <Text style={styles.settingLabel}>Interest Rate</Text>
                  </View>
                  <View style={styles.editInputRow}>
                    <TextInput
                      style={styles.editInput}
                      value={rateInput}
                      onChangeText={setRateInput}
                      keyboardType="decimal-pad"
                      autoFocus
                    />
                    <Pressable onPress={handleSaveRate} style={styles.saveBtn}>
                      <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                    </Pressable>
                  </View>
                </View>
              ) : (
                <SettingRow
                  icon={<Feather name="percent" size={20} color={Colors.primary} />}
                  label="Interest Rate"
                  value={`${user.interestRate}%`}
                  onPress={() => {
                    setRateInput(String(user.interestRate));
                    setEditingRate(true);
                  }}
                />
              )}
              <View style={styles.settingDivider} />
              <SettingRow
                icon={<Feather name="dollar-sign" size={20} color={Colors.primary} />}
                label="Loan Range"
                value={`$${user.minLoan} - $${user.maxLoan}`}
              />
              <View style={styles.settingDivider} />
              <SettingRow
                icon={<Feather name="clock" size={20} color={Colors.primary} />}
                label="Repayment Period"
                value={`${user.repaymentDays} days`}
              />
              <View style={styles.settingDivider} />
              <SettingRow
                icon={<Ionicons name="wallet-outline" size={20} color={Colors.primary} />}
                label="Wallet Balance"
                value={`$${user.walletBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
              />
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Pressable
            onPress={handleLogout}
            style={({ pressed }) => [styles.logoutBtn, pressed && { opacity: 0.8 }]}
          >
            <Ionicons name="swap-horizontal" size={20} color={Colors.error} />
            <Text style={styles.logoutText}>Switch Role</Text>
          </Pressable>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  profileHeader: {
    backgroundColor: Colors.surface,
    alignItems: "center",
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  profileAvatarText: {
    fontSize: 28,
    fontFamily: "DMSans_700Bold",
    color: "#FFFFFF",
  },
  profileName: {
    fontSize: 24,
    fontFamily: "DMSans_700Bold",
    color: Colors.text,
    marginBottom: 6,
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 20,
  },
  roleBadgeText: {
    fontSize: 13,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.primary,
  },
  profileStats: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  profileStat: {
    flex: 1,
    alignItems: "center",
  },
  profileStatValue: {
    fontSize: 18,
    fontFamily: "DMSans_700Bold",
    color: Colors.text,
  },
  profileStatLabel: {
    fontSize: 12,
    fontFamily: "DMSans_400Regular",
    color: Colors.textSecondary,
    marginTop: 2,
  },
  profileStatDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.divider,
    marginHorizontal: 20,
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.textSecondary,
    marginBottom: 10,
    paddingLeft: 4,
  },
  sectionCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  settingRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  settingLabel: {
    fontSize: 15,
    fontFamily: "DMSans_500Medium",
    color: Colors.text,
  },
  settingValue: {
    fontSize: 15,
    fontFamily: "DMSans_400Regular",
    color: Colors.textSecondary,
  },
  settingDivider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginLeft: 48,
  },
  editRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  editInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  editInput: {
    width: 60,
    fontSize: 15,
    fontFamily: "DMSans_500Medium",
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    textAlign: "center",
  },
  saveBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.errorLight,
    borderRadius: 14,
    paddingVertical: 14,
  },
  logoutText: {
    fontSize: 16,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.error,
  },
});
