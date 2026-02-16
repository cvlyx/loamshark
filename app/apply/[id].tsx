import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  TextInput,
  KeyboardAvoidingView,
  Alert,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useApp } from "@/lib/app-context";

export default function ApplyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { lenders, requestLoan } = useApp();
  const insets = useSafeAreaInsets();
  const lender = lenders.find(l => l.id === id);

  const [amount, setAmount] = useState("");
  const [purpose, setPurpose] = useState("");

  if (!lender) {
    return (
      <View style={styles.container}>
        <Text>Lender not found</Text>
      </View>
    );
  }

  const parsedAmount = parseFloat(amount) || 0;
  const interest = (parsedAmount * lender.interestRate) / 100;
  const totalRepayment = parsedAmount + interest;
  const isValid = parsedAmount >= lender.minLoan && parsedAmount <= lender.maxLoan && purpose.trim().length > 0;

  const handleSubmit = () => {
    if (!isValid) return;
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    requestLoan(lender.id, parsedAmount, purpose.trim());

    if (Platform.OS === "web") {
      router.dismissAll();
      router.push("/(tabs)/loans");
    } else {
      Alert.alert(
        "Request Sent",
        `Your loan request for $${parsedAmount} has been sent to ${lender.name}.`,
        [{
          text: "View My Loans",
          onPress: () => {
            router.dismissAll();
            router.push("/(tabs)/loans");
          },
        }]
      );
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.content}>
        <View style={styles.headerSection}>
          <View style={[styles.lenderAvatar, { backgroundColor: lender.avatarColor }]}>
            <Text style={styles.lenderInitials}>{lender.name.split(" ").map(n => n[0]).join("").toUpperCase()}</Text>
          </View>
          <Text style={styles.headerTitle}>Apply with {lender.name}</Text>
          <Text style={styles.headerSubtitle}>
            {lender.interestRate}% interest | {lender.repaymentDays}-day term
          </Text>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.label}>Loan Amount</Text>
          <View style={styles.amountInputRow}>
            <Text style={styles.currencySign}>$</Text>
            <TextInput
              style={styles.amountInput}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={Colors.textTertiary}
            />
          </View>
          <Text style={styles.rangeHint}>
            Min: ${lender.minLoan} | Max: ${lender.maxLoan.toLocaleString()}
          </Text>

          <Text style={[styles.label, { marginTop: 20 }]}>Purpose</Text>
          <TextInput
            style={styles.purposeInput}
            value={purpose}
            onChangeText={setPurpose}
            placeholder="What do you need this loan for?"
            placeholderTextColor={Colors.textTertiary}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {parsedAmount > 0 && (
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Loan Amount</Text>
              <Text style={styles.summaryValue}>${parsedAmount.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Interest ({lender.interestRate}%)</Text>
              <Text style={styles.summaryValue}>+${interest.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryTotalLabel}>Total Repayment</Text>
              <Text style={styles.summaryTotalValue}>${totalRepayment.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Due in</Text>
              <Text style={styles.summaryValue}>{lender.repaymentDays} days</Text>
            </View>
          </View>
        )}

        <View style={styles.bottomSection}>
          <Pressable
            onPress={handleSubmit}
            disabled={!isValid}
            style={({ pressed }) => [
              styles.submitBtn,
              !isValid && styles.submitBtnDisabled,
              pressed && isValid && { opacity: 0.9, transform: [{ scale: 0.98 }] },
            ]}
          >
            <Ionicons name="paper-plane" size={18} color="#FFFFFF" />
            <Text style={styles.submitBtnText}>Send Request</Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  headerSection: {
    alignItems: "center",
    marginBottom: 28,
  },
  lenderAvatar: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  lenderInitials: {
    fontSize: 20,
    fontFamily: "DMSans_700Bold",
    color: "#FFFFFF",
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "DMSans_700Bold",
    color: Colors.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: "DMSans_400Regular",
    color: Colors.textSecondary,
  },
  formSection: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.text,
    marginBottom: 8,
  },
  amountInputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.background,
    borderRadius: 14,
    paddingHorizontal: 16,
  },
  currencySign: {
    fontSize: 24,
    fontFamily: "DMSans_700Bold",
    color: Colors.text,
  },
  amountInput: {
    flex: 1,
    fontSize: 28,
    fontFamily: "DMSans_700Bold",
    color: Colors.text,
    paddingVertical: 14,
    paddingLeft: 8,
  },
  rangeHint: {
    fontSize: 12,
    fontFamily: "DMSans_400Regular",
    color: Colors.textTertiary,
    marginTop: 6,
    paddingLeft: 4,
  },
  purposeInput: {
    backgroundColor: Colors.background,
    borderRadius: 14,
    padding: 16,
    fontSize: 15,
    fontFamily: "DMSans_400Regular",
    color: Colors.text,
    minHeight: 80,
  },
  summaryCard: {
    backgroundColor: Colors.background,
    borderRadius: 14,
    padding: 16,
    gap: 8,
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 14,
    fontFamily: "DMSans_400Regular",
    color: Colors.textSecondary,
  },
  summaryValue: {
    fontSize: 14,
    fontFamily: "DMSans_500Medium",
    color: Colors.text,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginVertical: 4,
  },
  summaryTotalLabel: {
    fontSize: 15,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.text,
  },
  summaryTotalValue: {
    fontSize: 18,
    fontFamily: "DMSans_700Bold",
    color: Colors.primary,
  },
  bottomSection: {
    marginTop: "auto",
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
  },
  submitBtnDisabled: {
    opacity: 0.4,
  },
  submitBtnText: {
    fontSize: 16,
    fontFamily: "DMSans_700Bold",
    color: "#FFFFFF",
  },
});
