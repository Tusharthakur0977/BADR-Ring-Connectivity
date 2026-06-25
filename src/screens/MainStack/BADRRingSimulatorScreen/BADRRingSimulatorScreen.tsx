import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import React, { useEffect, useState } from 'react'
import { ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native'
import base64 from 'react-native-base64'
import { AppButton, AppText, ScreenDefaultContainer } from '../../../components/atoms'
import {
  BLE_CMD,
  CMD,
  CMD_TYPE_APP_TO_BLE,
  CMD_TYPE_BLE_TO_APP,
  FRAME_HEADER,
  FRAME_TAIL
} from '../../../consts/badrRingConsts'
import type { MainStackParamList } from '../../../navigation/navigators'
import { mockBADRRingDevice } from '../../../services/BLEService/MockBADRRingDevice'
import { mockBLEAdapter } from '../../../services/BLEService/MockBLEAdapter'
import { parsePacket } from '../../../utils/badrRingProtocol'

type BADRRingSimulatorScreenProps = NativeStackScreenProps<MainStackParamList, 'BADR_RING_SIMULATOR_SCREEN'>

export function BADRRingSimulatorScreen({
  navigation,
}: BADRRingSimulatorScreenProps) {
  const [isSimulating, setIsSimulating] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [batteryLevel, setBatteryLevel] = useState("85"); // Default from mockBADRRingDevice
  const [count, setCount] = useState(0);
  const [receivedCommands, setReceivedCommands] = useState<string[]>([]);
  const [lastCommand, setLastCommand] = useState("");
  const [lastParameter, setLastParameter] = useState("");
  const [isCharging, setIsCharging] = useState(false);
  const [brightness, setBrightness] = useState(5);
  const [language, setLanguage] = useState("English");
  const [prayerTimes, setPrayerTimes] = useState(
    "05:00,12:15,16:31,18:11,19:23"
  );
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [reminderStartTime, setReminderStartTime] = useState("06:00");
  const [reminderEndTime, setReminderEndTime] = useState("21:00");
  const [reminderInterval, setReminderInterval] = useState(20);

  // New state variables for TextInput fields
  const [softwareVersion, setSoftwareVersion] = useState("1.2.3");
  const [bleSettings, setBleSettings] = useState("");
  const [storedCountData, setStoredCountData] = useState("");
  const [vibrationSettings, setVibrationSettings] = useState("");
  const [languageInput, setLanguageInput] = useState(language);
  const [reminderSettingsInput, setReminderSettingsInput] = useState("");
  const [brightnessInput, setBrightnessInput] = useState(brightness.toString());

  // Sync the simulator state with the mock device when values change
  // Update the mock device with the simulator values
  useEffect(() => {
    if (isSimulating) {
      mockBADRRingDevice.setBatteryLevel(parseInt(batteryLevel, 10));
      // If connected, send updated battery level to the app
      if (mockBADRRingDevice.isRunning()) {
        sendCommandWithParameter(BLE_CMD.REPORT_CHARGE_LEVEL, batteryLevel);
      }
    }
  }, [batteryLevel, isSimulating]);

  // Update software version in mock device
  useEffect(() => {
    if (isSimulating) {
      mockBADRRingDevice.setCustomSoftwareVersion(softwareVersion);
    }
  }, [softwareVersion, isSimulating]);

  // Update BLE settings in mock device
  useEffect(() => {
    if (isSimulating && bleSettings) {
      mockBADRRingDevice.setCustomBleSettings(bleSettings);
    }
  }, [bleSettings, isSimulating]);

  // Update stored count data in mock device
  useEffect(() => {
    if (isSimulating && storedCountData) {
      mockBADRRingDevice.setCustomStoredCountData(storedCountData);
    }
  }, [storedCountData, isSimulating]);

  // Update vibration settings in mock device
  useEffect(() => {
    if (isSimulating && vibrationSettings) {
      mockBADRRingDevice.setCustomVibrationSettings(vibrationSettings);
    }
  }, [vibrationSettings, isSimulating]);

  useEffect(() => {
    if (isSimulating) {
      mockBADRRingDevice.setChargingStatus(isCharging);
    }
  }, [isCharging, isSimulating]);

  useEffect(() => {
    if (isSimulating) {
      mockBADRRingDevice.setBrightness(brightness);
    }
  }, [brightness, isSimulating]);

  // Sync brightnessInput with brightness
  useEffect(() => {
    setBrightnessInput(brightness.toString());
  }, [brightness]);

  // Update brightness when brightnessInput changes and is valid
  useEffect(() => {
    const newBrightness = parseInt(brightnessInput, 10);
    if (!isNaN(newBrightness) && newBrightness >= 1 && newBrightness <= 9) {
      setBrightness(newBrightness);
    }
  }, [brightnessInput]);

  useEffect(() => {
    if (isSimulating) {
      mockBADRRingDevice.setLanguage(language);
    }
  }, [language, isSimulating]);

  // Sync languageInput with language
  useEffect(() => {
    setLanguageInput(language);
  }, [language]);

  useEffect(() => {
    if (isSimulating) {
      mockBADRRingDevice.setPrayerTimes(prayerTimes);
    }
  }, [prayerTimes, isSimulating]);

  useEffect(() => {
    if (isSimulating) {
      mockBADRRingDevice.setReminderEnabled(reminderEnabled);
    }
  }, [reminderEnabled, isSimulating]);

  useEffect(() => {
    if (isSimulating) {
      mockBADRRingDevice.setReminderStartTime(reminderStartTime);
    }
  }, [reminderStartTime, isSimulating]);

  useEffect(() => {
    if (isSimulating) {
      mockBADRRingDevice.setReminderEndTime(reminderEndTime);
    }
  }, [reminderEndTime, isSimulating]);

  useEffect(() => {
    if (isSimulating) {
      mockBADRRingDevice.setReminderInterval(reminderInterval);
    }
  }, [reminderInterval, isSimulating]);

  // Start/stop the mock device when simulation is toggled
  useEffect(() => {
    console.log(
      "Simulator toggle effect triggered, isSimulating:",
      isSimulating
    );

    if (isSimulating) {
      console.log("Starting mock device and adapter");
      try {
        // First, make sure the mock device is stopped before starting it again
        if (mockBADRRingDevice.isRunning()) {
          console.log("Mock device already running, stopping it first");
          mockBADRRingDevice.stop();
        }

        // Start the mock device
        const device = mockBADRRingDevice.start();
        console.log("Mock device started:", device);
        addLog(`[INFO] Mock device started: ${device.name} (${device.id})`);

        // Update the mock device with all the current simulator values
        mockBADRRingDevice.setCustomSoftwareVersion(softwareVersion);
        if (bleSettings) {
          mockBADRRingDevice.setCustomBleSettings(bleSettings);
        }
        if (storedCountData) {
          mockBADRRingDevice.setCustomStoredCountData(storedCountData);
        }
        if (vibrationSettings) {
          mockBADRRingDevice.setCustomVibrationSettings(vibrationSettings);
        }
        mockBADRRingDevice.setBatteryLevel(parseInt(batteryLevel, 10));
        mockBADRRingDevice.setChargingStatus(isCharging);
        mockBADRRingDevice.setBrightness(brightness);
        mockBADRRingDevice.setLanguage(language);
        mockBADRRingDevice.setPrayerTimes(prayerTimes);
        mockBADRRingDevice.setReminderEnabled(reminderEnabled);
        mockBADRRingDevice.setReminderStartTime(reminderStartTime);
        mockBADRRingDevice.setReminderEndTime(reminderEndTime);
        mockBADRRingDevice.setReminderInterval(reminderInterval);

        // Enable the BLE adapter
        mockBLEAdapter.enable();
        console.log(
          "Mock BLE adapter enabled, isEnabled:",
          mockBLEAdapter.isAdapterEnabled()
        );
        addLog("[INFO] Mock BLE adapter enabled");

        // Add a small delay to ensure everything is initialized
        setTimeout(() => {
          console.log("Simulator initialization complete");
          addLog("[INFO] Simulator ready for connections");
        }, 500);
      } catch (error) {
        console.error("Error starting simulator:", error);
        addLog(
          `[ERROR] Starting simulator failed: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    } else {
      console.log("Stopping mock device and adapter");
      try {
        mockBADRRingDevice.stop();
        console.log(
          "Mock device stopped, isRunning:",
          mockBADRRingDevice.isRunning()
        );
        addLog("[INFO] Mock device stopped");

        mockBLEAdapter.disable();
        console.log(
          "Mock BLE adapter disabled, isEnabled:",
          mockBLEAdapter.isAdapterEnabled()
        );
        addLog("[INFO] Mock BLE adapter disabled");
      } catch (error) {
        console.error("Error stopping simulator:", error);
        addLog(
          `[ERROR] Stopping simulator failed: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }

    return () => {
      console.log(
        "Simulator screen unmounting, keeping simulator running if active"
      );
    };
  }, [isSimulating]);

  // Simulate receiving a command from the app
  const simulateReceiveCommand = (base64Data: string) => {
    const packet = parsePacket(base64Data);
    if (!packet) {
      addLog("[ERROR] Invalid packet received");
      return;
    }

    setLastCommand(packet.command);
    setLastParameter(packet.parameter);
    addLog(`[COMMAND] Received: ${packet.command}, param: ${packet.parameter}`);
    setReceivedCommands((prev) => [...prev, packet.command]);

    if (packet.commandType === CMD_TYPE_APP_TO_BLE) {
      handleAppCommand(packet.command, packet.parameter);
    }
  };

  // Handle commands from the app
  const handleAppCommand = (command: string, parameter: string) => {
    switch (command) {
      case CMD.FIND_RING:
        addLog("[ACTION] Ring is vibrating!");
        sendResponse(command, true);
        break;

      case CMD.SCREEN_ROTATION:
        addLog("[ACTION] Screen rotated");
        sendResponse(command, true);
        break;

      case CMD.SET_PRAYER_TIME_ALGORITHM:
        if (parameter.length >= 20) {
          const times = [
            parameter.substring(0, 4),
            parameter.substring(4, 8),
            parameter.substring(8, 12),
            parameter.substring(12, 16),
            parameter.substring(16, 20),
          ]
            .map((time) => `${time.substring(0, 2)}:${time.substring(2, 4)}`)
            .join(",");
          setPrayerTimes(times);
          addLog(`[ACTION] Prayer times set to: ${times}`);
          sendResponse(command, true);
        } else {
          addLog("[ERROR] Invalid prayer time format");
          sendResponse(command, false);
        }
        break;

      case CMD.SET_CUSTOM_COUNT_VIBRATION:
        setVibrationSettings(parameter);
        addLog(`[ACTION] Custom vibration set to: ${parameter}`);
        sendResponse(command, true);
        break;

      case CMD.RESTORE_DEFAULT_COUNT_VIBRATION:
        addLog("[ACTION] Default vibration restored");
        sendResponse(command, true);
        break;

      case CMD.LANGUAGE_SWITCH:
        if (
          languageInput &&
          (languageInput === "English" || languageInput === "Arabic")
        ) {
          // Use the input field if it's provided and valid
          setLanguage(languageInput);
          addLog(`[ACTION] Language set to: ${languageInput}`);
        } else {
          // Otherwise toggle between English and Arabic
          setLanguage((prev) => (prev === "English" ? "Arabic" : "English"));
          addLog(
            `[ACTION] Language switched to: ${
              language === "English" ? "Arabic" : "English"
            }`
          );
        }
        sendResponse(command, true);
        break;

      case CMD.SCREEN_BRIGHTNESS:
        // Check if we have a valid brightnessInput
        const inputLevel = parseInt(brightnessInput, 10);
        if (!isNaN(inputLevel) && inputLevel >= 1 && inputLevel <= 9) {
          setBrightness(inputLevel);
          addLog(`[ACTION] Brightness set from input to: ${inputLevel}`);
          sendResponse(command, true);
        } else {
          // Otherwise use the parameter from the command
          const level = parseInt(parameter, 10);
          if (level >= 1 && level <= 9) {
            setBrightness(level);
            addLog(`[ACTION] Brightness set to: ${level}`);
            sendResponse(command, true);
          } else {
            addLog("[ERROR] Invalid brightness level");
            sendResponse(command, false);
          }
        }
        break;

      case CMD.TASBIH_REMINDER_SETTING:
        if (reminderSettingsInput && reminderSettingsInput.length >= 11) {
          // Use the input field if it's provided and valid
          const enabled = reminderSettingsInput.substring(0, 1) === "1";
          const startTime = `${reminderSettingsInput.substring(
            1,
            3
          )}:${reminderSettingsInput.substring(3, 5)}`;
          const endTime = `${reminderSettingsInput.substring(
            5,
            7
          )}:${reminderSettingsInput.substring(7, 9)}`;
          const interval = parseInt(reminderSettingsInput.substring(9, 11), 10);

          setReminderEnabled(enabled);
          setReminderStartTime(startTime);
          setReminderEndTime(endTime);
          setReminderInterval(interval);

          addLog(
            `[ACTION] Reminder updated from input: ${
              enabled ? "ON" : "OFF"
            }, ${startTime}-${endTime}, interval: ${interval}min`
          );
          sendResponse(command, true);
        } else if (parameter.length >= 11) {
          // Otherwise use the parameter from the command
          const enabled = parameter.substring(0, 1) === "1";
          const startTime = `${parameter.substring(1, 3)}:${parameter.substring(
            3,
            5
          )}`;
          const endTime = `${parameter.substring(5, 7)}:${parameter.substring(
            7,
            9
          )}`;
          const interval = parseInt(parameter.substring(9, 11), 10);

          setReminderEnabled(enabled);
          setReminderStartTime(startTime);
          setReminderEndTime(endTime);
          setReminderInterval(interval);

          // Update the input field
          setReminderSettingsInput(parameter);

          addLog(
            `[ACTION] Reminder updated: ${
              enabled ? "ON" : "OFF"
            }, ${startTime}-${endTime}, interval: ${interval}min`
          );
          sendResponse(command, true);
        } else {
          addLog("[ERROR] Invalid reminder format");
          sendResponse(command, false);
        }
        break;

      case CMD.GET_BLE_SOFTWARE_VERSION:
        sendCommandWithParameter(command, softwareVersion);
        break;

      case CMD.GET_BLE_BATTERY_LEVEL:
        sendCommandWithParameter(command, batteryLevel);
        break;

      case CMD.GET_BLE_SETTINGS:
        // If bleSettings is provided, use it directly
        if (bleSettings) {
          sendCommandWithParameter(command, bleSettings);
        } else {
          // Otherwise, format settings string based on current values
          const formattedPrayerTimes = prayerTimes
            .split(",")
            .map((time) => time.replace(":", ""))
            .join("");

          // Create settings string in the expected format
          const settings = `${brightness}${formattedPrayerTimes}${
            reminderEnabled ? "1" : "0"
          }${reminderStartTime.replace(":", "")}${reminderEndTime.replace(
            ":",
            ""
          )}${reminderInterval.toString().padStart(2, "0")}`;

          // Update the bleSettings state
          setBleSettings(settings);
          sendCommandWithParameter(command, settings);
        }
        break;

      case CMD.SYNC_SYSTEM_TIME:
        if (parameter.length >= 15) {
          addLog(`[ACTION] Time synced: ${parameter}`);
          sendResponse(command, true);
        } else {
          addLog("[ERROR] Invalid time format");
          sendResponse(command, false);
        }
        break;

      case CMD.GET_STORED_COUNT_DATA:
        if (storedCountData) {
          // If custom stored count data is provided, use it
          sendCommandWithParameter(
            BLE_CMD.REPORT_STORED_DAILY_COUNTS,
            storedCountData
          );
          setTimeout(
            () => sendCommandWithParameter(BLE_CMD.REPORT_COMPLETE, ""),
            500
          );
        } else {
          // Otherwise use default behavior
          setTimeout(
            () =>
              sendCommandWithParameter(
                BLE_CMD.REPORT_STORED_DAILY_COUNTS,
                `0020230516${count + 10}`
              ),
            500
          );
          setTimeout(
            () =>
              sendCommandWithParameter(
                BLE_CMD.REPORT_STORED_DAILY_COUNTS,
                `0120230517${count + 15}`
              ),
            1000
          );
          setTimeout(
            () => sendCommandWithParameter(BLE_CMD.REPORT_COMPLETE, ""),
            1500
          );
        }
        break;

      case CMD.GET_CHARGING_STATUS:
        sendCommandWithParameter(command, isCharging ? "1" : "0");
        break;

      case CMD.RESTORE_FACTORY_SETTINGS:
        setBatteryLevel("85");
        setCount(0);
        setBrightness(5);
        setLanguage("English");
        setPrayerTimes("05:00,12:15,16:31,18:11,19:23");
        setReminderEnabled(true);
        setReminderStartTime("06:00");
        setReminderEndTime("21:00");
        setReminderInterval(20);
        addLog("[ACTION] Factory settings restored");
        sendResponse(command, true);
        break;

      default:
        addLog(`[ERROR] Unknown command: ${command}`);
        sendResponse(command, false);
    }
  };

  // Send a response to the app with correct command type
  const sendResponse = (command: string, success: boolean) => {
    const packet = createPacket(
      CMD_TYPE_BLE_TO_APP,
      command,
      success ? "1" : "0"
    );
    addLog(
      `[RESPONSE] Sent: ${packet} (command: ${command}, success: ${success})`
    );
    return packet;
  };

  // Send a command with parameter to the app
  const sendCommandWithParameter = (command: string, parameter: string) => {
    const packet = createPacket(CMD_TYPE_BLE_TO_APP, command, parameter);
    addLog(
      `[COMMAND] Sent: ${packet} (command: ${command}, param: ${parameter})`
    );
    return packet;
  };

  // Create a packet according to the protocol
  const createPacket = (
    commandType: string,
    command: string,
    parameter: string = ""
  ) => {
    const paramLength = parameter.length.toString(16).padStart(2, "0");
    const packet = `${FRAME_HEADER}${paramLength}${commandType}${command}${parameter}${FRAME_TAIL}`;
    return base64.encode(packet);
  };

  // Add a log entry
  const addLog = (message: string) => {
    setLogs((prev) => [message, ...prev].slice(0, 50));
  };

  // Increment the counter and send a notification
  const incrementCount = () => {
    if (isSimulating) {
      const newCount = mockBADRRingDevice.incrementCount();
      setCount(newCount);
      sendCommandWithParameter(
        BLE_CMD.REPORT_REALTIME_COUNT,
        newCount.toString()
      );
      addLog(`[ACTION] Count incremented to ${newCount}, notification sent`);
    } else {
      const newCount = count + 1;
      setCount(newCount);
      addLog(`[ACTION] Count incremented to ${newCount} (simulator off)`);
    }
  };

  // Toggle charging status and send a notification
  const toggleCharging = () => {
    const newChargingState = !isCharging;
    setIsCharging(newChargingState);
    if (isSimulating) {
      mockBADRRingDevice.setChargingStatus(newChargingState);
      if (newChargingState) {
        sendCommandWithParameter(BLE_CMD.CHARGER_PLUGGED_IN, batteryLevel);
      } else {
        sendCommandWithParameter(BLE_CMD.CHARGER_UNPLUGGED, "");
      }
      addLog(
        `[ACTION] Charging: ${
          newChargingState ? "CHARGING" : "NOT CHARGING"
        }, notification sent`
      );
    } else {
      addLog(
        `[ACTION] Charging: ${
          newChargingState ? "CHARGING" : "NOT CHARGING"
        } (simulator off)`
      );
    }
  };

  // Reset the counter and send a notification
  const resetCount = () => {
    setCount(0);
    if (isSimulating) {
      mockBADRRingDevice.resetCount();
      sendCommandWithParameter(BLE_CMD.REPORT_COUNT_RESET, "0");
      addLog("[ACTION] Count reset, notification sent");
    } else {
      addLog("[ACTION] Count reset (simulator off)");
    }
  };

  return (
    <ScreenDefaultContainer>
      <ScrollView>
        <View style={styles.section}>
          <AppText style={styles.sectionTitle}>BADR Ring Simulator</AppText>
          <View style={styles.row}>
            <AppText>Simulator Active:</AppText>
            <Switch value={isSimulating} onValueChange={setIsSimulating} />
          </View>
          <AppText style={styles.statusText}>
            Status: {isSimulating ? "ACTIVE" : "INACTIVE"}
          </AppText>
        </View>

        <View style={styles.section}>
          <AppText style={styles.sectionTitle}>Device Controls</AppText>
          <View style={styles.row}>
            <AppText>Battery Level: {batteryLevel}%</AppText>
            <TextInput
              style={styles.input}
              value={batteryLevel}
              onChangeText={setBatteryLevel}
              keyboardType="numeric"
              maxLength={3}
            />
          </View>
          <View style={styles.row}>
            <AppText>Count: {count}</AppText>
            <AppButton label="Increment" onPress={incrementCount} />
            <AppButton label="Reset" onPress={resetCount} />
          </View>
          <View style={styles.row}>
            <AppText>Charging: {isCharging ? "YES" : "NO"}</AppText>
            <AppButton label="Toggle" onPress={toggleCharging} />
          </View>
          <View style={styles.row}>
            <AppText>Brightness: {brightness}</AppText>
            <TextInput
              style={styles.input}
              value={brightnessInput}
              onChangeText={setBrightnessInput}
              keyboardType="numeric"
              maxLength={1}
              placeholder="1-9"
            />
          </View>
          <View style={styles.row}>
            <AppText>Language: {language}</AppText>
            <TextInput
              style={styles.inputWide}
              value={languageInput}
              onChangeText={setLanguageInput}
              placeholder="English or Arabic"
            />
          </View>
          <View style={styles.row}>
            <AppText>Vibration Settings:</AppText>
            <TextInput
              style={styles.inputWide}
              value={vibrationSettings}
              onChangeText={setVibrationSettings}
              placeholder="Vibration pattern"
            />
          </View>
          <View style={styles.row}>
            <AppText>Reminder Settings:</AppText>
            <TextInput
              style={styles.inputWide}
              value={reminderSettingsInput}
              onChangeText={setReminderSettingsInput}
              placeholder="Format: 10600210020"
            />
          </View>

          {/* New TextInput fields */}
          <View style={styles.row}>
            <AppText>Software Version:</AppText>
            <TextInput
              style={styles.inputWide}
              value={softwareVersion}
              onChangeText={setSoftwareVersion}
              placeholder="e.g. 1.2.3"
            />
          </View>

          <View style={styles.row}>
            <AppText>BLE Settings:</AppText>
            <TextInput
              style={styles.inputWide}
              value={bleSettings}
              onChangeText={setBleSettings}
              placeholder="Settings string"
            />
          </View>

          <View style={styles.row}>
            <AppText>Stored Count Data:</AppText>
            <TextInput
              style={styles.inputWide}
              value={storedCountData}
              onChangeText={setStoredCountData}
              placeholder="Count data string"
            />
          </View>
        </View>

        <View style={styles.section}>
          <AppText style={styles.sectionTitle}>Last Command</AppText>
          <AppText>Command: {lastCommand}</AppText>
          <AppText>Parameter: {lastParameter}</AppText>
        </View>

        <View style={styles.section}>
          <AppText style={styles.sectionTitle}>Logs</AppText>
          <ScrollView style={styles.logs}>
            {logs.map((log, index) => (
              <AppText key={index} style={styles.logEntry}>
                {log}
              </AppText>
            ))}
          </ScrollView>
        </View>
      </ScrollView>
    </ScreenDefaultContainer>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 20,
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#f5f5f5",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 4,
    padding: 5,
    width: 60,
    textAlign: "center",
  },
  inputWide: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 4,
    padding: 5,
    width: 200,
    textAlign: "left",
  },
  statusText: {
    fontWeight: "bold",
    color: "blue",
    marginTop: 5,
  },
  logs: {
    maxHeight: 200,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 4,
    padding: 5,
  },
  logEntry: {
    fontSize: 12,
    marginBottom: 2,
  },
});