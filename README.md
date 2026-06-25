# 💍 BADR Ring Connectivity App

A React Native mobile application built to seamlessly connect, manage, and synchronize data with the **BADR Smart Ring** over Bluetooth Low Energy (BLE). This project focuses on stable hardware integration, low-latency communication, and parsing complex hex-based protocols to deliver a smooth user experience.

## 🚀 Tech Stack

*   **Core Framework**: React Native (via Expo)
*   **Language**: TypeScript
*   **Navigation**: React Navigation (`@react-navigation/native-stack`)
*   **Styling**: Styled-Components
*   **Hardware / BLE**: `react-native-ble-plx`
*   **Data Encoding**: `react-native-base64`

---

## ⭐ Spotlight Feature: Custom BLE Protocol Engine

The most complex and technically challenging aspect of this application is the **Custom BLE Protocol Engine** (`badrRingProtocol.ts` & `BADRRingService.ts`), which bridges the gap between the mobile app and the low-level firmware of the smart ring. 

### Why it was difficult to build:
Hardware devices rarely speak JSON. The BADR Ring communicates using a strict, fixed-length hexadecimal packet structure encoded in Base64. Managing the data serialization/deserialization reliably while handling the unpredictable nature of Bluetooth connections (packet drops, latency, sudden disconnects) required a robust and fault-tolerant architecture.

### How it works under the hood:
1.  **Packet Construction**: When the app sends a command (e.g., syncing time, setting prayer times, or fetching tasbih counts), the engine constructs a binary payload. This involves calculating parameter lengths, appending custom frame headers/tails (`DC` and `LT`), and encoding the final hex string into Base64 for BLE transmission.
2.  **Asynchronous Parsing**: Incoming notifications from the ring are intercepted by a background listener, decoded from Base64, and validated against the protocol schema.
3.  **Data Hydration**: The raw hex strings are sliced and transformed into usable JavaScript objects (e.g., parsing a 14-character hex string into `{ index, date, count }` for daily tasbih tracking).
4.  **Hardware Abstraction**: The `MockBLEAdapter` and `MockBADRRingDevice` serve as a complete software simulator of the hardware ring, allowing UI/UX development and protocol testing without needing the physical device present.

---

## 🛠 Key Features

*   **Real-time BLE Scanning & Connection**: Efficiently scans for nearby BADR Rings, handles secure pairing, and manages the GATT characteristic discovery process.
*   **Hardware Simulator Mode**: A built-in virtual environment (`BADRRingSimulatorScreen`) that mimics BLE behavior, complete with mocked responses and state, allowing rapid iteration on UI/UX features.
*   **Resilient Connectivity**: Custom test screens (`DeviceOnDisconnectTestScreen`) designed to handle edge cases, auto-reconnection flows, and state recovery when the physical ring moves out of range.
*   **Interactive Dashboard**: A sleek UI that displays real-time hardware states, synchronizes prayer times, and tracks offline data fetched from the ring's onboard memory.

---

## 💡 Why This Project Stands Out

Building the BADR Ring Connectivity app required stepping outside the traditional web/mobile development boundaries and tackling the challenges of IoT and hardware integration. It demonstrates a strong grasp of bitwise operations, custom binary protocols, and state management in an asynchronous, hardware-dependent environment. By architecting a clean separation between the BLE layer and the UI—and building a complete hardware simulator—this project proves my ability to design scalable, testable, and highly technical mobile applications.
