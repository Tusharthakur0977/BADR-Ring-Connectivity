import React, { useState, useEffect } from 'react'
import { ScrollView, View, StyleSheet } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Device } from 'react-native-ble-plx'
import Toast from 'react-native-toast-message'
import { AppButton, AppText, AppTextInput, ScreenDefaultContainer } from '../../../components/atoms'
import type { MainStackParamList } from '../../../navigation/navigators'
import { BADRRingService } from '../../../services/BLEService/BADRRingService'
import { BLE_CMD, CMD } from '../../../consts/badrRingConsts'
import { parseStoredCountData } from '../../../utils/badrRingProtocol'
import { BleDevice } from '../../../components/molecules'

type BADRRingScreenProps = NativeStackScreenProps<MainStackParamList, 'BADR_RING_SCREEN'>
type DeviceExtendedByUpdateTime = Device & { updateTimestamp: number }

const MIN_TIME_BEFORE_UPDATE_IN_MILLISECONDS = 5000

export function BADRRingScreen({ navigation }: BADRRingScreenProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [foundDevices, setFoundDevices] = useState<
    DeviceExtendedByUpdateTime[]
  >([]);
  const [batteryLevel, setBatteryLevel] = useState<string>("");
  const [countData, setCountData] = useState<string>("");
  const [prayerTimes, setPrayerTimes] = useState<string>(
    "05:00,12:15,16:31,18:11,19:23"
  );
  const [reminderEnabled, setReminderEnabled] = useState<boolean>(true);
  const [reminderStartTime, setReminderStartTime] = useState<string>("06:00");
  const [reminderEndTime, setReminderEndTime] = useState<string>("21:00");
  const [reminderInterval, setReminderInterval] = useState<string>("20");
  const [brightnessLevel, setBrightnessLevel] = useState<string>("5");
  const [allData, setAllData] = useState<{ [key: string]: string } | null>(
    null
  );
  const [softwareVersion, setSoftwareVersion] = useState<string>("");
  const [vibrationSettings, setVibrationSettings] = useState<string>("");
  const [chargingStatus, setChargingStatus] = useState<string>("");
  const [language, setLanguage] = useState<string>("English");

  useEffect(() => {
    BADRRingService.onCommand(
      BLE_CMD.REPORT_STORED_DAILY_COUNTS,
      handleStoredCounts
    );
    BADRRingService.onCommand(
      BLE_CMD.REPORT_REALTIME_COUNT,
      handleRealtimeCount
    );
    BADRRingService.onCommand(BLE_CMD.REPORT_CHARGE_LEVEL, handleBatteryLevel);
    BADRRingService.onCommand(CMD.GET_BLE_SETTINGS, handleSettings);
    BADRRingService.onCommand(
      CMD.GET_BLE_SOFTWARE_VERSION,
      handleSoftwareVersion
    );
    BADRRingService.onCommand(BLE_CMD.CHARGER_PLUGGED_IN, handleChargingStatus);
    BADRRingService.onCommand(
      CMD.SET_CUSTOM_COUNT_VIBRATION,
      handleVibrationSettings
    );
    BADRRingService.onCommand(CMD.LANGUAGE_SWITCH, handleLanguageChange);

    // Auto-refresh data when connected
    if (isConnected) {
      getAllData();
    }

    return () => {
      BADRRingService.cleanup();
    };
  }, [isConnected]);

  const handleStoredCounts = (parameter: string) => {
    console.log("Handling stored counts with parameter:", parameter);
    const parsed = parseStoredCountData(parameter);
    if (parsed) {
      const formattedData = `Record #${parsed.index}: Date ${parsed.date}, Count: ${parsed.count}`;
      setCountData((prev) =>
        prev ? `${formattedData}\n${prev}` : formattedData
      );
      setAllData((prev) =>
        prev ? { ...prev, storedCountData: formattedData } : null
      );
    } else {
      setCountData((prev) =>
        prev ? `${prev}\nRaw data: ${parameter}` : `Raw data: ${parameter}`
      );
      setAllData((prev) =>
        prev ? { ...prev, storedCountData: parameter } : null
      );
    }
  };

  const handleRealtimeCount = (parameter: string) => {
    console.log("Handling realtime count with parameter:", parameter);
    Toast.show({
      type: "info",
      text1: "Count Updated",
      text2: `New count: ${parameter}`,
    });
  };

  const handleBatteryLevel = (parameter: string) => {
    console.log("Handling battery level with parameter:", parameter);
    setBatteryLevel(parameter);
    setAllData((prev) => (prev ? { ...prev, batteryLevel: parameter } : null));
  };

  const handleSettings = (parameter: string) => {
    console.log("Handling settings with parameter:", parameter);

    // Parse settings from the parameter string
    let formattedSettings = parameter;
    let brightness = "";
    let prayerTimesStr = "";
    let reminderEnabledStr = "";
    let reminderStartTimeStr = "";
    let reminderEndTimeStr = "";
    let reminderIntervalStr = "";

    try {
      if (parameter.length >= 1) {
        brightness = parameter.substring(0, 1);
        setBrightnessLevel(brightness);
      }

      if (parameter.length >= 21) {
        // Extract prayer times (positions 1-20)
        const times = [
          `${parameter.substring(1, 3)}:${parameter.substring(3, 5)}`,
          `${parameter.substring(5, 7)}:${parameter.substring(7, 9)}`,
          `${parameter.substring(9, 11)}:${parameter.substring(11, 13)}`,
          `${parameter.substring(13, 15)}:${parameter.substring(15, 17)}`,
          `${parameter.substring(17, 19)}:${parameter.substring(19, 21)}`,
        ];
        prayerTimesStr = times.join(",");
        setPrayerTimes(prayerTimesStr);

        // Extract reminder settings if available
        if (parameter.length >= 22) {
          reminderEnabledStr =
            parameter.substring(21, 22) === "1" ? "Yes" : "No";
          setReminderEnabled(parameter.substring(21, 22) === "1");

          if (parameter.length >= 26) {
            reminderStartTimeStr = `${parameter.substring(
              22,
              24
            )}:${parameter.substring(24, 26)}`;
            setReminderStartTime(reminderStartTimeStr);

            if (parameter.length >= 30) {
              reminderEndTimeStr = `${parameter.substring(
                26,
                28
              )}:${parameter.substring(28, 30)}`;
              setReminderEndTime(reminderEndTimeStr);

              if (parameter.length >= 32) {
                reminderIntervalStr = parameter.substring(30, 32);
                setReminderInterval(reminderIntervalStr);
              }
            }
          }
        }
      }

      // Format the settings for display
      formattedSettings = `Brightness: ${brightness}, Prayer Times: ${prayerTimesStr}, Reminder: ${
        reminderEnabledStr ? reminderEnabledStr : "Unknown"
      }, Start: ${reminderStartTimeStr}, End: ${reminderEndTimeStr}, Interval: ${reminderIntervalStr} min`;
    } catch (error) {
      console.error("Error parsing settings:", error);
      formattedSettings = `Raw settings: ${parameter}`;
    }

    setAllData((prev) =>
      prev ? { ...prev, settings: formattedSettings } : null
    );
  };

  const handleSoftwareVersion = (parameter: string) => {
    console.log("Handling software version with parameter:", parameter);
    setSoftwareVersion(parameter);
    setAllData((prev) =>
      prev ? { ...prev, softwareVersion: parameter } : null
    );
  };

  const handleChargingStatus = (parameter: string) => {
    console.log("Handling charging status with parameter:", parameter);
    const status = parameter === "1" ? "Charging" : "Not Charging";
    setChargingStatus(status);
    setAllData((prev) => (prev ? { ...prev, chargingStatus: status } : null));
  };

  const handleVibrationSettings = (parameter: string) => {
    console.log("Handling vibration settings with parameter:", parameter);
    setVibrationSettings(parameter);
    setAllData((prev) =>
      prev ? { ...prev, vibrationSettings: parameter } : null
    );
  };

  const handleLanguageChange = (parameter: string) => {
    console.log("Handling language change with parameter:", parameter);
    // The parameter might not directly contain the language name
    // We'll just toggle between English and Arabic for now
    const newLanguage = language === "English" ? "Arabic" : "English";
    setLanguage(newLanguage);
    setAllData((prev) => (prev ? { ...prev, language: newLanguage } : null));
  };

  const getAllData = async () => {
    try {
      const data = await BADRRingService.getAllMockData();
      setAllData(data);

      // Update all state variables with the retrieved data
      if (data.batteryLevel) {
        setBatteryLevel(data.batteryLevel);
      }

      if (data.softwareVersion) {
        setSoftwareVersion(data.softwareVersion);
      }

      if (data.chargingStatus) {
        setChargingStatus(
          data.chargingStatus === "1" ? "Charging" : "Not Charging"
        );
      }

      if (data.settings) {
        // Try to parse the settings string to extract individual values
        try {
          const settingsStr = data.settings;
          if (settingsStr.length >= 1) {
            setBrightnessLevel(settingsStr.substring(0, 1));
          }

          // Extract prayer times if available in the settings
          if (settingsStr.includes("Prayer Times:")) {
            const prayerTimesMatch = settingsStr.match(/Prayer Times: ([^,]+)/);
            if (prayerTimesMatch && prayerTimesMatch[1]) {
              setPrayerTimes(prayerTimesMatch[1]);
            }
          }

          // Extract reminder settings if available
          if (settingsStr.includes("Reminder:")) {
            const reminderMatch = settingsStr.match(/Reminder: ([^,]+)/);
            if (reminderMatch && reminderMatch[1]) {
              setReminderEnabled(reminderMatch[1] === "Yes");
            }

            const startTimeMatch = settingsStr.match(/Start: ([^,]+)/);
            if (startTimeMatch && startTimeMatch[1]) {
              setReminderStartTime(startTimeMatch[1]);
            }

            const endTimeMatch = settingsStr.match(/End: ([^,]+)/);
            if (endTimeMatch && endTimeMatch[1]) {
              setReminderEndTime(endTimeMatch[1]);
            }

            const intervalMatch = settingsStr.match(/Interval: (\d+)/);
            if (intervalMatch && intervalMatch[1]) {
              setReminderInterval(intervalMatch[1]);
            }
          }
        } catch (parseError) {
          console.error("Error parsing settings data:", parseError);
        }
      }

      if (data.vibrationSettings) {
        setVibrationSettings(data.vibrationSettings);
      }

      Toast.show({
        type: "success",
        text1: "All Data Retrieved",
        text2: "Successfully fetched all device data",
      });
    } catch (error) {
      console.error("Error fetching all data:", error);
      Toast.show({
        type: "error",
        text1: "Failed to Fetch Data",
        text2: "Could not retrieve all device data",
      });
    }
  };

  const startScan = () => {
    setIsScanning(true);
    setFoundDevices([]);
    console.log("Starting scan for BADR devices");
    BADRRingService.scanForBADRRings((device) => {
      console.log("Device found in BADRRingScreen:", device.name, device.id);
      addFoundDevice(device);
    });
    setTimeout(() => {
      console.log("Stopping scan");
      setIsScanning(false);
    }, 10000);
  };

  const addFoundDevice = (device: Device) => {
    setFoundDevices((currentDevices) => {
      if (isFoundDeviceUpdateNecessary(currentDevices, device)) {
        const updatedDevices = [...currentDevices];
        const deviceIndex = updatedDevices.findIndex(
          ({ id }) => device.id === id
        );
        const extendedDevice = {
          ...device,
          updateTimestamp: Date.now() + MIN_TIME_BEFORE_UPDATE_IN_MILLISECONDS,
        } as DeviceExtendedByUpdateTime;
        if (deviceIndex >= 0) {
          updatedDevices[deviceIndex] = extendedDevice;
        } else {
          updatedDevices.push(extendedDevice);
        }
        return updatedDevices;
      }
      return currentDevices;
    });
  };

  const isFoundDeviceUpdateNecessary = (
    currentDevices: DeviceExtendedByUpdateTime[],
    updatedDevice: Device
  ) => {
    const currentDevice = currentDevices.find(
      ({ id }) => updatedDevice.id === id
    );
    if (!currentDevice) return true;
    return currentDevice.updateTimestamp < Date.now();
  };

  const connectToDevice = async (device: Device) => {
    setIsConnecting(true);
    try {
      await BADRRingService.connectToBADRRing(device.id);
      setIsConnected(true);
      Toast.show({
        type: "success",
        text1: "Connected",
        text2: `Connected to ${device.name || "BADR Ring"}`,
      });
    } catch (error) {
      console.error("Connection error:", error);
      setIsConnected(false);
      Toast.show({
        type: "error",
        text1: "Connection Failed",
        text2: "Could not connect to the device",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const sendCommand = async (
    commandFn: () => Promise<any>,
    successMessage?: string
  ) => {
    try {
      console.log("Sending command with function:", commandFn.name);
      const result = await commandFn();
      console.log("Command result:", result);
      if (successMessage) {
        Toast.show({
          type: "success",
          text1: "Success",
          text2: successMessage,
        });
      }
      return result;
    } catch (error) {
      console.error("Command error:", error);
      let errorMessage = "Unknown error";
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === "string") {
        errorMessage = error;
      } else if (error && typeof error === "object" && "message" in error) {
        errorMessage = String(error.message);
      }
      Toast.show({
        type: "error",
        text1: "Command Failed",
        text2: errorMessage,
      });
      throw error;
    }
  };

  const deviceRender = (device: Device) => (
    <BleDevice onPress={connectToDevice} key={device.id} device={device} />
  );

  return (
    <ScreenDefaultContainer>
      <ScrollView>
        <View style={styles.section}>
          <AppText style={styles.sectionTitle}>Device Discovery</AppText>
          <AppButton
            label={isScanning ? "Scanning..." : "Scan for BADR Rings"}
            onPress={startScan}
            disabled={isScanning}
          />
          {foundDevices.length > 0 && (
            <View style={styles.deviceList}>
              <AppText>Found Devices:</AppText>
              {foundDevices.map((device) => deviceRender(device))}
            </View>
          )}
        </View>

        {isConnected && (
          <>
            <View style={styles.section}>
              <AppText style={styles.sectionTitle}>Device Controls</AppText>
              <View style={styles.row}>
                <AppButton
                  label="Find Ring"
                  onPress={() =>
                    sendCommand(
                      BADRRingService.findRing,
                      "Ring vibration triggered"
                    )
                  }
                />
                <AppButton
                  label="Rotate Screen"
                  onPress={() =>
                    sendCommand(BADRRingService.rotateScreen, "Screen rotated")
                  }
                />
              </View>
              <View style={styles.row}>
                <AppButton
                  label="Get Battery"
                  onPress={() =>
                    sendCommand(
                      BADRRingService.getBatteryLevel,
                      "Battery level retrieved"
                    )
                  }
                />
                <AppText>Battery: {batteryLevel}%</AppText>
              </View>
              <View style={styles.row}>
                <AppButton
                  label="Get Counts"
                  onPress={() =>
                    sendCommand(
                      BADRRingService.getStoredCountData,
                      "Count data retrieved"
                    )
                  }
                />
                <AppButton
                  label="Clear Counts"
                  onPress={() => setCountData("")}
                />
              </View>
              <View style={styles.row}>
                <AppButton label="Get All Data" onPress={getAllData} />
              </View>
              <View style={styles.dataBox}>
                <AppText style={styles.dataTitle}>Device Status</AppText>
                <View style={styles.dataRow}>
                  <AppText style={styles.dataLabel}>Software Version:</AppText>
                  <AppText style={styles.dataValue}>
                    {softwareVersion || "Unknown"}
                  </AppText>
                </View>
                <View style={styles.dataRow}>
                  <AppText style={styles.dataLabel}>Battery Level:</AppText>
                  <AppText style={styles.dataValue}>
                    {batteryLevel || "0"}%
                  </AppText>
                </View>
                <View style={styles.dataRow}>
                  <AppText style={styles.dataLabel}>Charging Status:</AppText>
                  <AppText style={styles.dataValue}>
                    {chargingStatus || "Unknown"}
                  </AppText>
                </View>
                <View style={styles.dataRow}>
                  <AppText style={styles.dataLabel}>Language:</AppText>
                  <AppText style={styles.dataValue}>{language}</AppText>
                </View>
                <View style={styles.dataRow}>
                  <AppText style={styles.dataLabel}>Brightness:</AppText>
                  <AppText style={styles.dataValue}>{brightnessLevel}</AppText>
                </View>
                {vibrationSettings && (
                  <View style={styles.dataRow}>
                    <AppText style={styles.dataLabel}>
                      Vibration Settings:
                    </AppText>
                    <AppText style={styles.dataValue}>
                      {vibrationSettings}
                    </AppText>
                  </View>
                )}
              </View>

              <View style={styles.dataBox}>
                <AppText style={styles.dataTitle}>Reminder Settings</AppText>
                <View style={styles.dataRow}>
                  <AppText style={styles.dataLabel}>Enabled:</AppText>
                  <AppText style={styles.dataValue}>
                    {reminderEnabled ? "Yes" : "No"}
                  </AppText>
                </View>
                <View style={styles.dataRow}>
                  <AppText style={styles.dataLabel}>Start Time:</AppText>
                  <AppText style={styles.dataValue}>
                    {reminderStartTime}
                  </AppText>
                </View>
                <View style={styles.dataRow}>
                  <AppText style={styles.dataLabel}>End Time:</AppText>
                  <AppText style={styles.dataValue}>{reminderEndTime}</AppText>
                </View>
                <View style={styles.dataRow}>
                  <AppText style={styles.dataLabel}>Interval:</AppText>
                  <AppText style={styles.dataValue}>
                    {reminderInterval} minutes
                  </AppText>
                </View>
              </View>

              {countData && (
                <View style={styles.dataBox}>
                  <AppText style={styles.dataTitle}>Count Data</AppText>
                  <AppText>{countData}</AppText>
                </View>
              )}
            </View>

            <View style={styles.section}>
              <AppText style={styles.sectionTitle}>
                Prayer Time Settings
              </AppText>
              <AppTextInput
                placeholder="Prayer Times (comma separated)"
                value={prayerTimes}
                onChangeText={setPrayerTimes}
              />
              <AppButton
                label="Set Prayer Times"
                onPress={() => {
                  const times = prayerTimes.split(",") as [
                    string,
                    string,
                    string,
                    string,
                    string
                  ];
                  if (times.length === 5) {
                    sendCommand(
                      () => BADRRingService.setPrayerTimeAlgorithm(times),
                      "Prayer times set successfully"
                    );
                  } else {
                    Toast.show({
                      type: "error",
                      text1: "Invalid Format",
                      text2: "Please enter 5 prayer times separated by commas",
                    });
                  }
                }}
              />
            </View>

            <View style={styles.section}>
              <AppText style={styles.sectionTitle}>Reminder Settings</AppText>
              <View style={styles.row}>
                <AppText>Enabled:</AppText>
                <AppButton
                  label={reminderEnabled ? "Yes" : "No"}
                  onPress={() => setReminderEnabled(!reminderEnabled)}
                />
              </View>
              <View style={styles.row}>
                <AppTextInput
                  placeholder="Start Time (HH:MM)"
                  value={reminderStartTime}
                  onChangeText={setReminderStartTime}
                  style={styles.timeInput}
                />
                <AppTextInput
                  placeholder="End Time (HH:MM)"
                  value={reminderEndTime}
                  onChangeText={setReminderEndTime}
                  style={styles.timeInput}
                />
                <AppTextInput
                  placeholder="Interval (min)"
                  value={reminderInterval}
                  onChangeText={setReminderInterval}
                  style={styles.intervalInput}
                  keyboardType="numeric"
                />
              </View>
              <AppButton
                label="Set Reminder"
                onPress={() => {
                  const interval = parseInt(reminderInterval, 10);
                  sendCommand(
                    () =>
                      BADRRingService.setTasbihReminder(
                        reminderEnabled,
                        reminderStartTime,
                        reminderEndTime,
                        interval
                      ),
                    "Reminder settings updated"
                  );
                }}
              />
            </View>

            <View style={styles.section}>
              <AppText style={styles.sectionTitle}>Display Settings</AppText>
              <View style={styles.row}>
                <AppText>Brightness (1-9):</AppText>
                <AppTextInput
                  value={brightnessLevel}
                  onChangeText={setBrightnessLevel}
                  style={styles.brightnessInput}
                  keyboardType="numeric"
                />
                <AppButton
                  label="Set"
                  onPress={() => {
                    const level = parseInt(brightnessLevel, 10);
                    if (level >= 1 && level <= 9) {
                      sendCommand(
                        () => BADRRingService.setScreenBrightness(level),
                        `Brightness set to ${level}`
                      );
                    } else {
                      Toast.show({
                        type: "error",
                        text1: "Invalid Value",
                        text2: "Brightness must be between 1 and 9",
                      });
                    }
                  }}
                />
              </View>
            </View>

            <View style={styles.section}>
              <AppText style={styles.sectionTitle}>Advanced</AppText>
              <View style={styles.row}>
                <AppButton
                  label="Sync Time"
                  onPress={() =>
                    sendCommand(
                      () => BADRRingService.syncTime(),
                      "Time synchronized"
                    )
                  }
                />
                <AppButton
                  label="Get Settings"
                  onPress={() =>
                    sendCommand(
                      BADRRingService.getSettings,
                      "Settings retrieved"
                    )
                  }
                />
              </View>
              <View style={styles.row}>
                <AppButton
                  label="Factory Reset"
                  onPress={() =>
                    sendCommand(
                      BADRRingService.restoreFactorySettings,
                      "Factory settings restored"
                    )
                  }
                />
              </View>
            </View>
          </>
        )}
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
  deviceList: {
    marginTop: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    flexWrap: "wrap",
  },
  dataBox: {
    padding: 12,
    backgroundColor: "#e0e0e0",
    borderRadius: 8,
    marginTop: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  dataTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#333",
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    paddingBottom: 5,
  },
  dataRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: "#ddd",
  },
  dataLabel: {
    fontSize: 14,
    color: "#555",
    flex: 1,
    fontWeight: "500",
  },
  dataValue: {
    fontSize: 14,
    color: "#333",
    flex: 1,
    textAlign: "right",
    fontWeight: "bold",
  },
  timeInput: {
    flex: 1,
    marginRight: 5,
  },
  intervalInput: {
    width: 80,
  },
  brightnessInput: {
    width: 200,
    marginHorizontal: 10,
  },
});