// CCRO/app/Auth/PersonalDetailsScreen.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { auth, firestore } from "../../firebase/firebaseConfig";
import { updateProfile, onAuthStateChanged, User } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { Picker } from "@react-native-picker/picker";
import DateTimePicker from "@react-native-community/datetimepicker";

const GOLD = "#a87c5f";
type UserType = User | any;

export default function PersonalDetailsScreen() {
  const router = useRouter();

  const [user, setUser] = useState<UserType | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [gender, setGender] = useState("");
  const [tempGender, setTempGender] = useState(""); // ✅ temp fix
  const [dob, setDob] = useState<Date | null>(null);
  const [showGenderPicker, setShowGenderPicker] = useState(false);
  const [showDobPicker, setShowDobPicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setName(currentUser.displayName || "");
        setEmail(currentUser.email || "");
        try {
          const userDoc = doc(firestore, "users", currentUser.uid);
          const snapshot = await getDoc(userDoc);
          if (snapshot.exists()) {
            const data = snapshot.data();
            setPhone(data.phone || "");
            setAddress(data.address || "");
            setGender(data.gender || "");
            setDob(data.dob ? new Date(data.dob) : null);
          }
        } catch (error) {
          console.warn("Error fetching user details:", error);
        }
      } else {
        router.replace("/Auth/AuthScreen");
      }
    });
    return unsubscribe;
  }, []);

  const handleSave = async () => {
    if (!name || !email) {
      Alert.alert("Error", "Name and Email are required.");
      return;
    }

    const numericPhone = phone.replace(/\D/g, "");
    if (numericPhone && !/^91[6-9]\d{9}$/.test(numericPhone)) {
      Alert.alert("Error", "Enter valid Indian number starting with 6–9 and 10 digits.");
      return;
    }

    if (!dob) {
      Alert.alert("Error", "Please select your Date of Birth.");
      return;
    }

    const today = new Date();
    const age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    const dayDiff = today.getDate() - dob.getDate();
    const realAge =
      monthDiff > 0 || (monthDiff === 0 && dayDiff >= 0) ? age : age - 1;

    if (realAge < 18) {
      Alert.alert("Error", "You must be at least 18 years old to continue.");
      return;
    }

    const dobString = dob.toISOString().split("T")[0];

    try {
      setIsSaving(true);
      if (user) {
        await updateProfile(user, { displayName: name });
        const userDoc = doc(firestore, "users", user.uid);
        await setDoc(
          userDoc,
          { name, email, phone, address, gender, dob: dobString },
          { merge: true }
        );
        setIsSaving(false);
        Alert.alert("Success", "Profile saved successfully!");
        router.replace("/tabs/HomeScreen");
      }
    } catch (err: any) {
      setIsSaving(false);
      Alert.alert("Error", err.message);
    }
  };

  if (!user) return null;

  const eighteenYearsAgo = new Date();
  eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tell us about yourself</Text>

      {/* Full Name */}
      <TextInput
        style={styles.input}
        placeholder="Full Name"
        placeholderTextColor={GOLD}
        value={name}
        onChangeText={setName}
      />

      {/* Email */}
      <TextInput
        style={[styles.input, { backgroundColor: "#222" }]}
        placeholder="Email"
        placeholderTextColor={GOLD}
        value={email}
        editable={false}
      />

      {/* Phone */}
      <TextInput
        style={styles.input}
        placeholder="+91 Phone Number"
        placeholderTextColor={GOLD}
        value={phone}
        onChangeText={(text) => {
          let digits = text.replace(/\D/g, "");
          if (digits.startsWith("91")) digits = digits.slice(2);
          if (digits.length > 10) digits = digits.slice(0, 10);
          const formatted = `+91 ${digits.slice(0, 5)}${
            digits.length > 5 ? " " + digits.slice(5) : ""
          }`;
          setPhone(formatted.trim());
        }}
        keyboardType="phone-pad"
        maxLength={17}
      />

      {/* Address */}
      <TextInput
        style={styles.input}
        placeholder="Address"
        placeholderTextColor={GOLD}
        value={address}
        onChangeText={setAddress}
      />

      {/* Gender Picker */}
      <TouchableOpacity
        style={styles.dateButton}
        onPress={() => {
          setTempGender(gender || "Male"); // ✅ preselect last or default
          setShowGenderPicker(true);
        }}
      >
        <Text style={[styles.dateText, !gender && { color: "#a87c5f" }]}>
          {gender || "Select Gender"}
        </Text>
      </TouchableOpacity>

      {/* Gender Modal */}
      <Modal
        transparent
        animationType="slide"
        visible={showGenderPicker}
        onRequestClose={() => setShowGenderPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.pickerContainer}>
            <Text style={styles.modalTitle}>Select Gender</Text>
            <Picker
              selectedValue={tempGender}
              onValueChange={(value) => setTempGender(value)}
              style={styles.picker}
              itemStyle={styles.pickerItem}
            >
              <Picker.Item label="Male" value="Male" />
              <Picker.Item label="Female" value="Female" />
              <Picker.Item label="Other" value="Other" />
            </Picker>
            <TouchableOpacity
              style={styles.doneButton}
              onPress={() => {
                setGender(tempGender); // ✅ always applies current
                setShowGenderPicker(false);
              }}
            >
              <Text style={styles.doneText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* DOB Picker */}
      <TouchableOpacity
        style={styles.dateButton}
        onPress={() => setShowDobPicker(true)}
      >
        <Text style={[styles.dateText, !dob && { color: "#a87c5f" }]}>
          {dob ? dob.toDateString() : "Select Date of Birth"}
        </Text>
      </TouchableOpacity>

      {/* DOB Modal */}
      <Modal
        transparent
        animationType="slide"
        visible={showDobPicker}
        onRequestClose={() => setShowDobPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.pickerContainer}>
            <Text style={styles.modalTitle}>Select Date of Birth</Text>
            <DateTimePicker
              value={dob || new Date(eighteenYearsAgo)}
              mode="date"
              display="spinner"
              onChange={(event, selectedDate) => {
                if (event.type === "set" && selectedDate) setDob(selectedDate);
              }}
              maximumDate={eighteenYearsAgo}
            />
            <TouchableOpacity
              style={styles.doneButton}
              onPress={() => setShowDobPicker(false)}
            >
              <Text style={styles.doneText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Save Button */}
      <TouchableOpacity style={styles.button} onPress={handleSave}>
        <Text style={styles.buttonText}>Save & Continue</Text>
      </TouchableOpacity>

      {/* Loading */}
      <Modal transparent animationType="fade" visible={isSaving}>
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={GOLD} />
            <Text style={styles.loadingText}>Saving your details...</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: { color: GOLD, fontSize: 22, fontWeight: "bold", marginBottom: 25 },
  input: {
    width: "100%",
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    padding: 14,
    color: GOLD,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    marginBottom: 15,
    shadowColor: "#553e2fff",
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  dateButton: {
    width: "100%",
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    padding: 14,
    marginBottom: 15,
    shadowColor: "#553e2fff",
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  dateText: { color: GOLD, fontSize: 16 },
  button: {
    backgroundColor: GOLD,
    paddingVertical: 14,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: { color: "#000", fontWeight: "700", fontSize: 16 },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  pickerContainer: {
    backgroundColor: "#1a1a1a",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 10,
  },
  modalTitle: {
    color: GOLD,
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 10,
  },
  picker: { backgroundColor: "#000", color: GOLD },
  pickerItem: { color: GOLD, fontSize: 18 },
  doneButton: {
    backgroundColor: GOLD,
    margin: 15,
    borderRadius: 10,
    alignItems: "center",
    paddingVertical: 10,
  },
  doneText: { color: "#000", fontSize: 16, fontWeight: "bold" },
  loadingOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingBox: {
    backgroundColor: "#1a1a1a",
    padding: 30,
    borderRadius: 15,
    alignItems: "center",
  },
  loadingText: {
    color: GOLD,
    marginTop: 10,
    fontSize: 16,
    fontWeight: "600",
  },
});
