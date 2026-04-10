# CCRO - Credit Card Reward Optimizer 💳✨

**Maximize Your Rewards, Optimize Every Swipe.**

CCRO is a premium, AI-powered mobile application designed to help users maximize their credit card rewards and benefits. Built with **React Native** and **Expo**, it leverages **Google's Gemini AI** to provide intelligent, personalized advice on which card to use for any transaction to ensure the highest possible value.

---

## 🚀 Key Features

### 🤖 AI-Powered Reward Advisor
*   **Intelligent Reasoning:** Uses Google's Generative AI (Gemini) to analyze card benefits and recommend the best card for specific purchase categories.
*   **Local Fallback:** Robust local rule-based advisor ensures you get advice even when offline or during API rate limits.
*   **Context-Aware:** Understands your specific portfolio of cards to provide tailored recommendations.

### 📊 Comprehensive Dashboard & Analytics
*   **Visual Insights:** Real-time reward tracking and spending analysis using interactive charts.
*   **Reward Categorization:** View your points, cashback, and miles accumulated across different spending habits.
*   **Milestone Celebrations:** Interactive UI elements (like confetti cannons) to celebrate reward milestones.

### 💳 Intelligent Card Management
*   **Multi-Card Support:** Seamlessly add and manage cards from various banks (HDFC, ICICI, Axis, Amex, etc.).
*   **Dynamic Data:** Real-time syncing of card details and reward structures via Firebase.
*   **Secure Storage:** User data is securely managed through Firebase Authentication and Firestore.

### 🎨 Premium UI/UX
*   **Deep Dark Mode:** A sleek, high-contrast dark theme optimized for readability and battery life.
*   **Fluid Animations:** Powered by **Moti** and **React Native Reanimated** for a smooth, high-fidelity experience.
*   **Responsive Design:** Fully optimized for both iOS and Android devices.

---

## 🛠 Technology Stack

- **Framework:** [Expo](https://expo.dev/) (SDK 54) & [React Native](https://reactnative.dev/)
- **Language:** TypeScript
- **AI Engine:** [Google Generative AI (Gemini)](https://ai.google.dev/)
- **Backend:** [Firebase](https://firebase.google.com/) (Authentication & Firestore)
- **Animations:** [Moti](https://moti.fyi/) & [Reanimated](https://docs.swmansion.com/react-native-reanimated/)
- **Navigation:** [Expo Router](https://docs.expo.dev/router/introduction/) (File-based routing)
- **Visualization:** [React Native Chart Kit](https://github.com/indiespirit/react-native-chart-kit)

---

## 📸 Screenshots & UI

> [!TIP]
> **View the Experience:** The app features a high-end dark-themed aesthetic with gold accents (`#a87c5f`).

| Dashboard | AI Advisor | Analysis |
| :---: | :---: | :---: |
| ![Dashboard Placeholder](https://via.placeholder.com/200x400?text=Dashboard) | ![AI Advisor Placeholder](https://via.placeholder.com/200x400?text=AI+Advisor) | ![Analysis Placeholder](https://via.placeholder.com/200x400?text=Analysis) |

---

## 🏁 Getting Started

### Prerequisites
- Node.js (Latest LTS)
- npm or yarn
- [Expo Go](https://expo.dev/go) app on your mobile device (for testing)

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd CCRO
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file (or update your config) with your Firebase and Gemini API keys:
   ```env
   EXPO_PUBLIC_GEMINI_API_KEY=your_gemini_api_key
   ```

4. **Start the development server:**
   ```bash
   npx expo start
   ```

Scan the QR code with your terminal or Expo Go app to launch.

---

## 🏗 Project Architecture

```bash
├── app/               # Expo Router file-based screens
│   ├── tabs/          # Main bottom-tab navigation
│   ├── Auth/          # Login & Signup flows
│   └── AIAdvisor.tsx  # Core AI Chat Interface
├── assets/            # Static assets (images, fonts, logos)
├── context/           # React Context for global state (Auth, Cards)
├── firebase/          # Firebase configuration and helpers
├── utils/             # Business logic and AI service integration
└── components/        # Reusable UI components
```

---

## 🔒 Security & Privacy

Privacy is a top priority for CCRO.
- **Local Rules:** We prioritize local processing for reward calculations.
- **Encrypted Sync:** Data synced to Firebase is protected by robust security rules.
- **No Sensitive Data:** We focus on reward structures and general spending categories, never requiring full card numbers or sensitive financial credentials.

---

## 📄 License

This project is [Private/Internal]. All rights reserved.

---

Developed with ❤️ by Bhavesh Rakthe
