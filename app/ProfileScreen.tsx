// CCRO/app/tabs/ProfileScreen.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Modal,
  ActivityIndicator,
  SafeAreaView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { auth, firestore } from "../firebase/firebaseConfig";
import {
  updatePassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  User,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import { useNotifications } from "../context/NotificationContext";

const GOLD = "#a87c5f";
type UserType = User | any;

const formatDateToString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${day}-${month}-${year}`;
};

export default function ProfileScreen() {
  const router = useRouter();
  const { addNotification } = useNotifications();
  const [user, setUser] = useState<UserType | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");

  const [isDobModalVisible, setIsDobModalVisible] = useState(false);
  const [isGenderModalVisible, setGenderModalVisible] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);

  const [tempDob, setTempDob] = useState(new Date());

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setName(currentUser.displayName ?? "");

        try {
          const userDoc = doc(firestore, "users", currentUser.uid);
          const snapshot = await getDoc(userDoc);

          if (snapshot.exists()) {
            const data = snapshot.data();
            const fetchedDob = data.dob ?? "";
            setPhone(data.phone ?? "");
            setAddress(data.address ?? "");
            setDob(fetchedDob);
            setGender(data.gender ?? "");
            if (fetchedDob) setTempDob(new Date(fetchedDob));
          }
        } catch (err: any) {
          console.warn("Profile fetch failed:", err.message);
        }
      } else {
        router.replace("/Auth/AuthScreen");
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const handlePhoneChange = (input: string) => {
    const digits = input.replace(/\D/g, "");
    let formatted = "+91 ";
    if (digits.startsWith("91")) {
      formatted += digits.slice(2, 12);
    } else {
      formatted += digits.slice(0, 10);
    }
    setPhone(formatted);
  };

  const onDobChange = (event: any, selectedDate?: Date) => {
    if (selectedDate) {
      const today = new Date();
      const minAdultDate = new Date(
        today.getFullYear() - 18,
        today.getMonth(),
        today.getDate()
      );

      if (selectedDate > minAdultDate) {
        Alert.alert("Invalid Date", "You must be at least 18 years old.");
        return;
      }
      setTempDob(selectedDate);
      setDob(formatDateToString(selectedDate));
    }
    if (Platform.OS !== "ios") setIsDobModalVisible(false);
  };

  const handleSaveDetails = async () => {
    if (!user) return;

    if (!name.trim()) {
      Alert.alert("Error", "Name cannot be empty.");
      return;
    }
    if (!phone.startsWith("+91") || phone.replace(/\D/g, "").length !== 12) {
      Alert.alert("Error", "Please enter a valid 10-digit phone number.");
      return;
    }

    setSaving(true);

    try {
      await updateProfile(user, { displayName: name });
      const userDoc = doc(firestore, "users", user.uid);

      await setDoc(
        userDoc,
        { name, phone, address, dob, gender },
        { merge: true }
      );

      Alert.alert("Saved", "Personal details updated successfully!");
      setIsEditingDetails(false);

      await addNotification(
        "Profile Updated",
        "Your personal details have been successfully updated.",
        "success"
      );
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }

    setSaving(false);
  };

  // ⭐ FIXED — PASSWORD CHANGE WITH REAUTH
  const handleSavePassword = async () => {
    if (!currentPassword.trim()) {
      Alert.alert("Error", "Please enter your current password.");
      return;
    }

    if (!newPassword || newPassword.length < 8) {
      Alert.alert("Error", "New password must be at least 8 characters.");
      return;
    }

    try {
      const credential = EmailAuthProvider.credential(
        auth.currentUser!.email!,
        currentPassword
      );

      // 🔐 Step 1: Reauthenticate
      await reauthenticateWithCredential(auth.currentUser!, credential);

      // 🔐 Step 2: Update password
      await updatePassword(auth.currentUser!, newPassword);

      Alert.alert("Success", "Password updated successfully!");

      await addNotification(
        "Security Alert",
        "Your password was recently changed. If this wasn't you, assume your account is compromised.",
        "warning"
      );

      setCurrentPassword("");
      setNewPassword("");
      setIsEditingPassword(false);
    } catch (err: any) {
      if (err.code === "auth/wrong-password") {
        Alert.alert("Error", "Current password is incorrect.");
      } else {
        Alert.alert("Error", err.message);
      }
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.replace("/Auth/AuthScreen");
  };

  if (loading)
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={GOLD} />
      </View>
    );

  const email = user?.email ?? "";
  const avatarLetter = (email[0] ?? "U").toUpperCase();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Avatar */}
        <View style={styles.avatarCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{avatarLetter}</Text>
          </View>
          <Text style={styles.name}>{name || "User"}</Text>
          <Text style={styles.userId}>{email}</Text>
        </View>

        {/* Personal Details */}
        <View style={styles.infoCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Personal Details</Text>
            <TouchableOpacity
              onPress={() =>
                isEditingDetails
                  ? handleSaveDetails()
                  : setIsEditingDetails(true)
              }
            >
              <MaterialIcons
                name={isEditingDetails ? "save" : "edit"}
                size={22}
                color={GOLD}
              />
            </TouchableOpacity>
          </View>

          <TextInput
            style={isEditingDetails ? styles.inputActive : styles.inputLocked}
            value={name}
            onChangeText={setName}
            placeholder="Full Name"
            placeholderTextColor="#777"
            editable={isEditingDetails}
          />

          <TextInput
            style={isEditingDetails ? styles.inputActive : styles.inputLocked}
            value={phone}
            onChangeText={handlePhoneChange}
            placeholder="+91 XXXXXXXXXX"
            placeholderTextColor="#777"
            keyboardType="phone-pad"
            editable={isEditingDetails}
          />

          <TextInput
            style={isEditingDetails ? styles.inputActive : styles.inputLocked}
            value={address}
            onChangeText={setAddress}
            placeholder="Address"
            placeholderTextColor="#777"
            editable={isEditingDetails}
          />

          <TouchableOpacity
            style={isEditingDetails ? styles.inputActive : styles.inputLocked}
            onPress={() => isEditingDetails && setIsDobModalVisible(true)}
            disabled={!isEditingDetails}
          >
            <Text
              style={isEditingDetails ? styles.textActive : styles.textLocked}
            >
              {dob || "Select Date of Birth"}
            </Text>
          </TouchableOpacity>

          {/* DOB Modal */}
          <Modal
            transparent
            animationType="slide"
            visible={isDobModalVisible}
            onRequestClose={() => setIsDobModalVisible(false)}
          >
            <View style={styles.modalContainer}>
              <View style={styles.wheelModal}>
                <Text style={styles.modalTitle}>Select Date of Birth</Text>
                <DateTimePicker
                  value={tempDob}
                  mode="date"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={onDobChange}
                  maximumDate={new Date()}
                />
                <TouchableOpacity
                  style={styles.doneButton}
                  onPress={() => setIsDobModalVisible(false)}
                >
                  <Text style={styles.doneButtonText}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          {/* Gender */}
          <TouchableOpacity
            style={isEditingDetails ? styles.inputActive : styles.inputLocked}
            onPress={() => isEditingDetails && setGenderModalVisible(true)}
            disabled={!isEditingDetails}
          >
            <Text
              style={isEditingDetails ? styles.textActive : styles.textLocked}
            >
              {gender || "Select Gender"}
            </Text>
          </TouchableOpacity>

          {/* Gender Modal */}
          <Modal
            transparent
            animationType="slide"
            visible={isGenderModalVisible}
            onRequestClose={() => setGenderModalVisible(false)}
          >
            <View style={styles.modalContainer}>
              <View style={styles.wheelModal}>
                <Text style={styles.modalTitle}>Select Gender</Text>
                <Picker
                  selectedValue={gender}
                  style={styles.picker}
                  itemStyle={styles.pickerItem}
                  onValueChange={(itemValue) => setGender(itemValue)}
                >
                  <Picker.Item label="Male" value="Male" />
                  <Picker.Item label="Female" value="Female" />
                  <Picker.Item label="Other" value="Other" />
                </Picker>
                <TouchableOpacity
                  style={styles.doneButton}
                  onPress={() => setGenderModalVisible(false)}
                >
                  <Text style={styles.doneButtonText}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          {isEditingDetails && (
            <TouchableOpacity
              style={[styles.saveButton, saving && { opacity: 0.7 }]}
              onPress={handleSaveDetails}
              disabled={saving}
            >
              <Text style={styles.saveText}>
                {saving ? "Saving..." : "Save Changes"}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Password Change */}
        <View style={styles.infoCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Password Change</Text>
            <TouchableOpacity
              onPress={() =>
                isEditingPassword
                  ? handleSavePassword()
                  : setIsEditingPassword(true)
              }
            >
              <MaterialIcons
                name={isEditingPassword ? "save" : "edit"}
                size={22}
                color={GOLD}
              />
            </TouchableOpacity>
          </View>

          {isEditingPassword && (
            <TextInput
              style={styles.inputActive}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry
              placeholder="Current Password"
              placeholderTextColor="#777"
            />
          )}

          <TextInput
            style={isEditingPassword ? styles.inputActive : styles.inputLocked}
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            placeholder="Enter New Password"
            placeholderTextColor="#777"
            editable={isEditingPassword}
          />
        </View>

        {/* SIGN OUT */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#000" },
  container: { alignItems: "center", padding: 20, paddingBottom: 80 },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarCard: { alignItems: "center", marginBottom: 20 },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: GOLD,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  avatarText: { color: "#000", fontSize: 36, fontWeight: "bold" },
  name: { color: GOLD, fontSize: 22, fontWeight: "bold" },
  userId: { color: "#888787ff", fontSize: 14, marginTop: 3 },
  infoCard: {
    width: "100%",
    backgroundColor: "#111",
    borderRadius: 16,
    padding: 15,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: "#222"
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionTitle: { color: GOLD, fontSize: 16, fontWeight: "600" },
  inputActive: {
    backgroundColor: "#1a1a1a",
    borderRadius: 10,
    padding: 12,
    color: GOLD,
    borderWidth: 1,
    borderColor: GOLD,
    marginBottom: 12,
  },
  inputLocked: {
    backgroundColor: "#111",
    borderRadius: 10,
    padding: 12,
    color: "#aaa",
    borderWidth: 1,
    borderColor: "#222",
    marginBottom: 12,
  },
  textActive: { color: GOLD },
  textLocked: { color: "#aaa" },
  saveButton: {
    backgroundColor: GOLD,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
  },
  saveText: { color: "#000", fontWeight: "700", fontSize: 15 },
  logoutButton: {
    width: "100%",
    backgroundColor: GOLD,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  logoutText: { color: "#000", fontWeight: "bold", fontSize: 16 },
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.8)",
  },
  wheelModal: {
    backgroundColor: "#161616",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333"
  },
  modalTitle: {
    color: GOLD,
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 10,
    textAlign: "center",
  },
  picker: { width: "100%", color: GOLD, backgroundColor: "transparent" },
  pickerItem: { color: GOLD },
  doneButton: {
    marginTop: 15,
    backgroundColor: GOLD,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  doneButtonText: { color: "#000", fontWeight: "700", fontSize: 16 },
});
