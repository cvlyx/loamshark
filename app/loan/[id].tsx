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
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";
import Colors from "@/constants/colors";
import { useApp } from "@/lib/app-context";

function getStatusConfig(status: string) {
  switch (status) {
    case "pending":
      return { color: Colors.warning, bg: Colors.warningLight, label: "Pending Approval", icon: "time-outline" as const };
    case "approved":
      return { color: Colors.info, bg: Colors.infoLight, label: "Approved", icon: "checkmark-circle-outline" as const };
    case "active":
      return { color: Colors.success, bg: Colors.successLight, label: "Active", icon: "pulse-outline" as const };
    case "completed":
      return { color: Colors.primary, bg: Colors.primaryLight, label: "Completed", icon: "checkmark-done" as const };
    case "declined":
      return { color: Colors.error, bg: Colors.errorLight, label: "Declined", icon: "close-circle-outline" as const };
    default:
      return { color: Colors.textSecondary, bg: Colors.background, label: status, icon: "help-circle-outline" as const };
  }
}

export default function LoanDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { role, borrowerLoans, lenderLoans, approveLoan, declineLoan, makePayment } = useApp();
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const isLender = role === "lender";
  const allLoans = [...lenderLoans, ...borrowerLoans];
  const loan = allLoans.find(l => l.id === id);
  const [payAmount, setPayAmount] = useState("");
  const [showPayment, setShowPayment] = useState(false);

  if (!loan) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Loan not found</Text>
      </View>
    );
  }

  const status = getStatusConfig(loan.status);
  const progress = loan.totalRepayment > 0 ? loan.amountPaid / loan.totalRepayment : 0;
  const remaining = loan.totalRepayment - loan.amountPaid;

  const handleApprove = () => {
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    approveLoan(loan.id);
    if (Platform.OS !== "web") {
      Alert.alert("Approved", `Loan of $${loan.amount} approved for ${loan.borrowerName}.`);
    }
  };

  const handleDecline = () => {
    if (Platform.OS === "web") {
      declineLoan(loan.id);
    } else {
      Alert.alert("Decline Loan", "Are you sure you want to decline this request?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Decline",
          style: "destructive",
          onPress: () => declineLoan(loan.id),
        },
      ]);
    }
  };

  const handlePayment = () => {
    const amt = parseFloat(payAmount);
    if (isNaN(amt) || amt <= 0 || amt > remaining) return;
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    makePayment(loan.id, amt);
    setPayAmount("");
    setShowPayment(false);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.backRow, { paddingTop: insets.top + 8 + webTopInset }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.backTitle}>Loan Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.statusCard}>
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <Ionicons name={status.icon} size={16} color={status.color} />
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
          <Text style={styles.loanAmount}>${loan.amount.toLocaleString()}</Text>
          <Text style={styles.loanPurpose}>{loan.purpose}</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{isLender ? "Borrower" : "Lender"}</Text>
            <Text style={styles.detailValue}>
              {isLender ? loan.borrowerName : loan.lenderName}
            </Text>
          </View>
          <View style={styles.detailDivider} />
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Interest Rate</Text>
            <Text style={styles.detailValue}>{loan.interestRate}%</Text>
          </View>
          <View style={styles.detailDivider} />
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Total Repayment</Text>
            <Text style={styles.detailValue}>${loan.totalRepayment.toFixed(2)}</Text>
          </View>
          <View style={styles.detailDivider} />
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Repayment Period</Text>
            <Text style={styles.detailValue}>{loan.repaymentDays} days</Text>
          </View>
          <View style={styles.detailDivider} />
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Request Date</Text>
            <Text style={styles.detailValue}>{loan.requestDate}</Text>
          </View>
          {loan.dueDate && (
            <>
              <View style={styles.detailDivider} />
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Due Date</Text>
                <Text style={styles.detailValue}>{loan.dueDate}</Text>
              </View>
            </>
          )}
        </Animated.View>

        {(loan.status === "active" || loan.status === "completed") && (
          <Animated.View entering={FadeInDown.delay(300).duration(400)} style={styles.progressCard}>
            <Text style={styles.cardTitle}>Repayment Progress</Text>
            <View style={styles.progressCircleArea}>
              <View style={styles.progressInfo}>
                <Text style={styles.progressPercent}>{Math.round(progress * 100)}%</Text>
                <Text style={styles.progressSubtext}>
                  ${loan.amountPaid.toFixed(2)} of ${loan.totalRepayment.toFixed(2)}
                </Text>
              </View>
            </View>
            <View style={styles.progressBarLarge}>
              <View
                style={[
                  styles.progressFillLarge,
                  {
                    width: `${Math.min(progress * 100, 100)}%`,
                    backgroundColor: loan.status === "completed" ? Colors.primary : Colors.success,
                  },
                ]}
              />
            </View>
            {remaining > 0 && (
              <Text style={styles.remainingText}>
                ${remaining.toFixed(2)} remaining
              </Text>
            )}
          </Animated.View>
        )}

        {loan.payments.length > 0 && (
          <Animated.View entering={FadeInDown.delay(400).duration(400)} style={styles.paymentsCard}>
            <Text style={styles.cardTitle}>Payment History</Text>
            {loan.payments.map((payment, i) => (
              <View key={payment.id} style={styles.paymentRow}>
                <View style={styles.paymentLeft}>
                  <View style={styles.paymentDot} />
                  <View>
                    <Text style={styles.paymentAmount}>${payment.amount.toFixed(2)}</Text>
                    <Text style={styles.paymentDate}>{payment.date}</Text>
                  </View>
                </View>
                <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
              </View>
            ))}
          </Animated.View>
        )}

        <View style={{ height: 140 }} />
      </ScrollView>

      {loan.status === "pending" && isLender && (
        <View style={[styles.actionBar, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 16) }]}>
          <Pressable
            onPress={handleDecline}
            style={({ pressed }) => [styles.declineBtn, pressed && { opacity: 0.8 }]}
          >
            <Ionicons name="close" size={20} color={Colors.error} />
            <Text style={styles.declineBtnText}>Decline</Text>
          </Pressable>
          <Pressable
            onPress={handleApprove}
            style={({ pressed }) => [styles.approveBtn, pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] }]}
          >
            <Ionicons name="checkmark" size={20} color="#FFFFFF" />
            <Text style={styles.approveBtnText}>Approve</Text>
          </Pressable>
        </View>
      )}

      {loan.status === "active" && !isLender && (
        <View style={[styles.actionBar, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 16) }]}>
          {showPayment ? (
            <View style={styles.paymentForm}>
              <View style={styles.paymentInputRow}>
                <Text style={styles.payCurrency}>$</Text>
                <TextInput
                  style={styles.payInput}
                  value={payAmount}
                  onChangeText={setPayAmount}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={Colors.textTertiary}
                  autoFocus
                />
              </View>
              <View style={styles.payBtnRow}>
                <Pressable onPress={() => setShowPayment(false)} style={styles.payCancelBtn}>
                  <Text style={styles.payCancelText}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={handlePayment}
                  disabled={!parseFloat(payAmount) || parseFloat(payAmount) > remaining}
                  style={({ pressed }) => [
                    styles.payConfirmBtn,
                    (!parseFloat(payAmount) || parseFloat(payAmount) > remaining) && { opacity: 0.4 },
                    pressed && { opacity: 0.9 },
                  ]}
                >
                  <Text style={styles.payConfirmText}>Pay</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              onPress={() => setShowPayment(true)}
              style={({ pressed }) => [styles.makePaymentBtn, pressed && { opacity: 0.9 }]}
            >
              <Ionicons name="card-outline" size={20} color="#FFFFFF" />
              <Text style={styles.makePaymentText}>Make a Payment</Text>
            </Pressable>
          )}
        </View>
      )}
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  backTitle: {
    fontSize: 17,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.text,
  },
  statusCard: {
    backgroundColor: Colors.surface,
    margin: 20,
    borderRadius: 18,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
    marginBottom: 16,
  },
  statusText: {
    fontSize: 14,
    fontFamily: "DMSans_600SemiBold",
  },
  loanAmount: {
    fontSize: 36,
    fontFamily: "DMSans_700Bold",
    color: Colors.text,
    marginBottom: 4,
  },
  loanPurpose: {
    fontSize: 15,
    fontFamily: "DMSans_400Regular",
    color: Colors.textSecondary,
  },
  detailsCard: {
    marginHorizontal: 20,
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  detailLabel: {
    fontSize: 14,
    fontFamily: "DMSans_400Regular",
    color: Colors.textSecondary,
  },
  detailValue: {
    fontSize: 14,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.text,
  },
  detailDivider: {
    height: 1,
    backgroundColor: Colors.divider,
  },
  progressCard: {
    marginHorizontal: 20,
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  cardTitle: {
    fontSize: 17,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.text,
    marginBottom: 16,
  },
  progressCircleArea: {
    alignItems: "center",
    marginBottom: 16,
  },
  progressInfo: {
    alignItems: "center",
  },
  progressPercent: {
    fontSize: 32,
    fontFamily: "DMSans_700Bold",
    color: Colors.text,
  },
  progressSubtext: {
    fontSize: 13,
    fontFamily: "DMSans_400Regular",
    color: Colors.textSecondary,
    marginTop: 4,
  },
  progressBarLarge: {
    height: 10,
    backgroundColor: Colors.background,
    borderRadius: 5,
    overflow: "hidden",
  },
  progressFillLarge: {
    height: "100%",
    borderRadius: 5,
  },
  remainingText: {
    fontSize: 13,
    fontFamily: "DMSans_500Medium",
    color: Colors.textSecondary,
    textAlign: "center",
    marginTop: 8,
  },
  paymentsCard: {
    marginHorizontal: 20,
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  paymentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  paymentLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  paymentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.success,
  },
  paymentAmount: {
    fontSize: 15,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.text,
  },
  paymentDate: {
    fontSize: 12,
    fontFamily: "DMSans_400Regular",
    color: Colors.textTertiary,
  },
  actionBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    paddingTop: 14,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
  },
  declineBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: Colors.errorLight,
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 10,
  },
  declineBtnText: {
    fontSize: 16,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.error,
  },
  approveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
  },
  approveBtnText: {
    fontSize: 16,
    fontFamily: "DMSans_700Bold",
    color: "#FFFFFF",
  },
  makePaymentBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
  },
  makePaymentText: {
    fontSize: 16,
    fontFamily: "DMSans_700Bold",
    color: "#FFFFFF",
  },
  paymentForm: {
    gap: 12,
  },
  paymentInputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.background,
    borderRadius: 14,
    paddingHorizontal: 16,
  },
  payCurrency: {
    fontSize: 22,
    fontFamily: "DMSans_700Bold",
    color: Colors.text,
  },
  payInput: {
    flex: 1,
    fontSize: 24,
    fontFamily: "DMSans_700Bold",
    color: Colors.text,
    paddingVertical: 12,
    paddingLeft: 8,
  },
  payBtnRow: {
    flexDirection: "row",
    gap: 10,
  },
  payCancelBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: Colors.background,
  },
  payCancelText: {
    fontSize: 16,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.textSecondary,
  },
  payConfirmBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: Colors.primary,
  },
  payConfirmText: {
    fontSize: 16,
    fontFamily: "DMSans_700Bold",
    color: "#FFFFFF",
  },
});
