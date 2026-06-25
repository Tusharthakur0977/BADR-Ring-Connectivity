import {
  BleError,
  Characteristic,
  type Base64,
  type TransactionId,
} from "react-native-ble-plx";
import { BLEService } from "./BLEService";
import { mockBLEAdapter } from "./MockBLEAdapter";
import {
  BADR_SERVICE_UUID,
  BADR_WRITE_CHARACTERISTIC_UUID,
  BADR_REPORT_CHARACTERISTIC_UUID,
  BADR_RING_NAME,
  CMD,
  BLE_CMD,
  RESPONSE,
  CMD_TYPE_BLE_TO_APP,
} from "../../consts/badrRingConsts";
import {
  createAppToBlePacket,
  createAppResponsePacket,
  parsePacket,
  formatDateForSync,
  formatPrayerTimes,
  formatTasbihReminder,
  parseStoredCountData,
} from "../../utils/badrRingProtocol";
import { mockBADRRingDevice } from "./MockBADRRingDevice";

class BADRRingServiceInstance {
  // Store callbacks for different BLE commands
  private commandCallbacks: Map<string, (parameter: string) => void> =
    new Map();
  private monitorSubscription: any = null;
  private isMonitoringReports: boolean = false;

  /**
   * Scan specifically for BADR Ring devices
   *
   * @param onDeviceFound - Callback when a device is found
   */
  scanForBADRRings = (onDeviceFound: (device: any) => void) => {
    console.log("BADRRingService.scanForBADRRings called");

    BLEService.initializeBLE().then(() => {
      console.log("BLE initialized, checking mock adapter");

      // First try to use the mock adapter
      const adapterEnabled = mockBLEAdapter.isAdapterEnabled();
      console.log("Mock adapter enabled:", adapterEnabled);

      if (adapterEnabled) {
        console.log("Attempting to intercept scan with mock adapter");
        const intercepted = mockBLEAdapter.interceptScan(onDeviceFound);
        console.log("Scan intercepted:", intercepted);

        if (intercepted) {
          console.log("Using mock BLE adapter for scanning");
          return;
        }
      }

      console.log("Falling back to real scanning");
      // Fall back to real scanning
      BLEService.scanDevices((device) => {
        console.log("Real scan found device:", device.name);
        // Filter for devices with name containing "BADR" (case insensitive)
        if (device.name && device.name === BADR_RING_NAME) {
          console.log(`Found ${BADR_RING_NAME} device, calling callback`);
          onDeviceFound(device);
        }
      });
    });
  };

  /**
   * Connect to a BADR Ring device and set up monitoring
   *
   * @param deviceId - Device ID to connect to
   * @returns Promise that resolves when connected and services are discovered
   */
  connectToBADRRing = async (deviceId: string) => {
    try {
      console.log("Connecting to BADR Ring with device ID:", deviceId);

      // Check if we should use the mock adapter
      if (mockBLEAdapter.isAdapterEnabled() || mockBADRRingDevice.isRunning()) {
        console.log(
          "Mock adapter is enabled or mock device is running, using mock device"
        );

        // Always enable the mock adapter when connecting
        if (!mockBLEAdapter.isAdapterEnabled()) {
          console.log("Auto-enabling mock adapter for connection");
          mockBLEAdapter.enable();
        }

        // Get the mock device ID - ensure it's a valid Bluetooth MAC address
        const mockId = mockBADRRingDevice.getDeviceId();
        console.log("Using mock device ID:", mockId);

        // Create a mock device with a valid Bluetooth address
        const mockDevice = {
          id: mockId,
          name: BADR_RING_NAME,
        };

        console.log("Created mock device:", mockDevice);

        // Set up monitoring for reports from the ring
        this.setupReportMonitoring();

        // Make sure the mock device is running
        if (!mockBADRRingDevice.isRunning()) {
          console.log("Starting mock device for connection");
          mockBADRRingDevice.start();

          // Add a small delay to ensure the device is fully started
          await new Promise((resolve) => setTimeout(resolve, 300));
        }

        // Send all data from the simulator to the app
        console.log("Sending all simulator data to app");
        const responses = mockBADRRingDevice.sendAllDataToApp();

        // Process each response with a small delay between them to ensure proper processing
        for (const response of responses) {
          const parsed = parsePacket(response);
          if (parsed && parsed.commandType === CMD_TYPE_BLE_TO_APP) {
            const callback = this.commandCallbacks.get(parsed.command);
            if (callback) {
              console.log(
                `Processing auto-sent data: ${parsed.command}, parameter: ${parsed.parameter}`
              );
              callback(parsed.parameter);
              // Add a small delay between processing responses
              await new Promise((resolve) => setTimeout(resolve, 50));
            }
          }
        }

        // Don't actually try to sync time with the mock device yet
        // We'll handle that in the sendCommand method

        return mockDevice;
      }

      console.log("Connecting to real device");
      // Connect to the real device with more detailed logging
      try {
        const device = await BLEService.connectToDevice(deviceId);
        console.log("Connected to real device:", device.id, device.name);

        console.log("Connected to real device, discovering services");
        try {
          // Discover services and characteristics
          await BLEService.discoverAllServicesAndCharacteristicsForDevice();
          console.log("Services discovered successfully");
        } catch (discoverError) {
          console.error("Error discovering services:", discoverError);
          throw discoverError;
        }

        console.log("Setting up monitoring");
        // Set up monitoring for reports from the ring
        this.setupReportMonitoring();

        console.log("Syncing time");
        // Sync time with the device
        try {
          await this.syncTime();
          console.log("Time synced successfully");
        } catch (syncError) {
          console.error("Error syncing time:", syncError);
          // Continue even if time sync fails
        }

        return device;
      } catch (connectionError) {
        console.error("Error in connection process:", connectionError);
        throw connectionError;
      }
    } catch (error) {
      console.error("Error connecting to BADR Ring:", error);
      throw error;
    }
  };

  /**
   * Set up monitoring for reports from the BADR Ring
   */
  setupReportMonitoring = () => {
    if (this.isMonitoringReports) {
      return;
    }

    this.isMonitoringReports = true;

    // Set up monitor for the report characteristic
    BLEService.setupMonitor(
      BADR_SERVICE_UUID,
      BADR_REPORT_CHARACTERISTIC_UUID,
      this.handleReportCharacteristic,
      (error) => {
        console.error("Error in BADR Ring report monitoring:", error);
        this.isMonitoringReports = false;
      }
    );
  };

  /**
   * Handle incoming report characteristic data
   */
  handleReportCharacteristic = (characteristic: Characteristic) => {
    if (!characteristic.value) {
      return;
    }

    const packet = parsePacket(characteristic.value);
    if (!packet) {
      console.error("Invalid packet received from BADR Ring");
      return;
    }

    // Process the packet based on command type and command
    if (packet.commandType === "02") {
      // BLE to APP
      console.log(
        `Received BLE report: ${packet.command}, parameter: ${packet.parameter}`
      );

      // Send acknowledgment for reports that require it
      if (
        [BLE_CMD.REPORT_STORED_DAILY_COUNTS, BLE_CMD.REPORT_COMPLETE].includes(
          packet.command
        )
      ) {
        this.sendAppResponse(packet.command, true);
      }

      // Call the registered callback for this command if it exists
      const callback = this.commandCallbacks.get(packet.command);
      if (callback) {
        callback(packet.parameter);
      }
    }
  };

  /**
   * Check if a device is connected
   *
   * @returns True if a device is connected, false otherwise
   */
  isDeviceConnected = (): boolean => {
    // Check if we're using the mock adapter
    console.log("Checking if device is connected");

    if (mockBLEAdapter.isAdapterEnabled()) {
      console.log("Mock adapter is enabled, assuming device is connected");
      return true;
    }

    // Check if we have a real device
    const hasRealDevice = BLEService.getDevice() !== null;
    console.log("Has real device:", hasRealDevice);
    return hasRealDevice;
  };

  /**
   * Send a command to the BADR Ring
   *
   * @param command - Command code
   * @param parameter - Command parameter (optional)
   * @returns Promise that resolves when command is sent
   */
  async sendCommand(command: string, parameter: string = ""): Promise<void> {
    console.log(
      "Attempting to send command:",
      command,
      "parameter:",
      parameter
    );
    const packet = createAppToBlePacket(command, parameter);
    console.log("Using mock adapter for command");
    const response = mockBLEAdapter.interceptWrite(
      mockBADRRingDevice.getDeviceId(),
      BADR_SERVICE_UUID,
      BADR_WRITE_CHARACTERISTIC_UUID,
      packet
    );
    if (response) {
      console.log(
        "Sent command to mock device:",
        command,
        "parameter:",
        parameter
      );
      console.log("Response:", response);
      const parsed = parsePacket(response);
      if (parsed) {
        console.log("Parsed response:", parsed);
        const callback = this.commandCallbacks.get(parsed.command);
        if (callback && parsed.commandType === CMD_TYPE_BLE_TO_APP) {
          console.log(`Calling callback for command: ${parsed.command}`);
          callback(parsed.parameter);
        } else {
          console.log(
            "No callback or incorrect command type for command:",
            parsed.command
          );
        }
      }
    } else {
      throw new Error("No response from mock adapter");
    }
  }

  /**
   * Send a response from APP to Bluetooth
   *
   * @param command - Command code to respond to
   * @param success - Whether the operation was successful
   */
  sendAppResponse = async (command: string, success: boolean) => {
    const packet = createAppResponsePacket(command, success);

    try {
      await BLEService.writeCharacteristicWithResponseForDevice(
        BADR_SERVICE_UUID,
        BADR_WRITE_CHARACTERISTIC_UUID,
        packet
      );
      console.log(`Sent response to command: ${command}, success: ${success}`);
      return true;
    } catch (error) {
      console.error(`Error sending response to ${command}:`, error);
      return false;
    }
  };

  /**
   * Register a callback for a specific BLE command
   *
   * @param command - Command code to listen for
   * @param callback - Function to call when command is received
   */
  onCommand(command: string, callback: (parameter: string) => void) {
    this.commandCallbacks.set(command, callback);
  }

  /**
   * Remove a callback for a specific BLE command
   *
   * @param command - Command code to stop listening for
   */
  offCommand(command: string) {
    this.commandCallbacks.delete(command);
  }

  /**
   * Clean up resources when disconnecting
   */
  cleanup = () => {
    this.commandCallbacks.clear();
    this.isMonitoringReports = false;
    BLEService.finishMonitor();
  };

  // Specific command implementations

  /**
   * Find the ring (makes it vibrate)
   */
  findRing = () => this.sendCommand(CMD.FIND_RING);

  /**
   * Rotate the screen
   */
  rotateScreen = () => this.sendCommand(CMD.SCREEN_ROTATION);

  /**
   * Set prayer time algorithm
   *
   * @param times - Array of prayer times [fajr, dhuhr, asr, maghrib, isha]
   */
  setPrayerTimeAlgorithm = (
    times: [string, string, string, string, string]
  ) => {
    const formattedTimes = formatPrayerTimes(times);
    return this.sendCommand(CMD.SET_PRAYER_TIME_ALGORITHM, formattedTimes);
  };

  /**
   * Set custom count vibration
   *
   * @param vibrationSetting - 2-digit vibration setting
   */
  setCustomCountVibration = (vibrationSetting: number) => {
    const setting = vibrationSetting.toString().padStart(2, "0");
    return this.sendCommand(CMD.SET_CUSTOM_COUNT_VIBRATION, setting);
  };

  /**
   * Restore default count vibration
   */
  restoreDefaultCountVibration = () =>
    this.sendCommand(CMD.RESTORE_DEFAULT_COUNT_VIBRATION);

  /**
   * Switch language
   */
  switchLanguage = () => this.sendCommand(CMD.LANGUAGE_SWITCH);

  /**
   * Set screen brightness
   *
   * @param level - Brightness level (1-9)
   */
  setScreenBrightness = (level: number) => {
    if (level < 1 || level > 9) {
      console.error("Brightness level must be between 1 and 9");
      return Promise.resolve(false);
    }
    return this.sendCommand(CMD.SCREEN_BRIGHTNESS, level.toString());
  };

  /**
   * Set tasbih reminder
   *
   * @param enabled - Whether reminders are enabled
   * @param startTime - Start time in 24h format (e.g., "06:00")
   * @param endTime - End time in 24h format (e.g., "21:00")
   * @param intervalMinutes - Interval in minutes
   */
  setTasbihReminder = (
    enabled: boolean,
    startTime: string,
    endTime: string,
    intervalMinutes: number
  ) => {
    const setting = formatTasbihReminder(
      enabled,
      startTime,
      endTime,
      intervalMinutes
    );
    return this.sendCommand(CMD.TASBIH_REMINDER_SETTING, setting);
  };

  /**
   * Get Bluetooth software version
   */
  getSoftwareVersion = () => this.sendCommand(CMD.GET_BLE_SOFTWARE_VERSION);

  /**
   * Get Bluetooth battery level
   */
  getBatteryLevel = () => this.sendCommand(CMD.GET_BLE_BATTERY_LEVEL);

  /**
   * Get Bluetooth settings
   */
  getSettings = () => this.sendCommand(CMD.GET_BLE_SETTINGS);

  /**
   * Sync system time
   *
   * @param date - Date to sync (defaults to current time)
   */
  syncTime = (date: Date = new Date()) => {
    const timeString = formatDateForSync(date);
    return this.sendCommand(CMD.SYNC_SYSTEM_TIME, timeString);
  };

  /**
   * Get stored count data
   */
  getStoredCountData = () => this.sendCommand(CMD.GET_STORED_COUNT_DATA);

  /**
   * Get charging status
   */
  getChargingStatus = () => this.sendCommand(CMD.GET_CHARGING_STATUS);

  /**
   * Restore factory settings
   */
  restoreFactorySettings = () => this.sendCommand(CMD.RESTORE_FACTORY_SETTINGS);

  /**
   * Power off Bluetooth device
   */
  powerOffDevice = () => this.sendCommand(CMD.POWER_OFF_BLE_DEVICE);

  async getAllMockData(): Promise<any> {
    if (!mockBLEAdapter.isAdapterEnabled()) {
      mockBLEAdapter.enable();
    }

    // Make sure the mock device is running
    if (!mockBADRRingDevice.isRunning()) {
      mockBADRRingDevice.start();
    }

    const allData: { [key: string]: string } = {};

    const commands = [
      {
        command: CMD.GET_BLE_BATTERY_LEVEL,
        responseCommand: BLE_CMD.REPORT_CHARGE_LEVEL,
        key: "batteryLevel",
      },
      {
        command: CMD.GET_STORED_COUNT_DATA,
        responseCommand: BLE_CMD.REPORT_STORED_DAILY_COUNTS,
        key: "storedCountData",
      },
      {
        command: CMD.GET_BLE_SETTINGS,
        responseCommand: CMD.GET_BLE_SETTINGS,
        key: "settings",
      },
      {
        command: CMD.GET_BLE_SOFTWARE_VERSION,
        responseCommand: CMD.GET_BLE_SOFTWARE_VERSION,
        key: "softwareVersion",
      },
      {
        command: CMD.GET_CHARGING_STATUS,
        responseCommand: BLE_CMD.CHARGER_PLUGGED_IN,
        key: "chargingStatus",
      },
    ];

    const promises = commands.map(({ command, responseCommand, key }) => {
      return new Promise<void>((resolve) => {
        this.onCommand(responseCommand, (parameter: string) => {
          console.log(`Received ${key}:`, parameter);
          allData[key] = parameter;
          resolve();
        });
        this.sendCommand(command).catch((error) => {
          console.error(`Error fetching ${key}:`, error);
          allData[key] = "error";
          resolve();
        });
      });
    });

    await Promise.all(promises);

    commands.forEach(({ responseCommand }) => this.offCommand(responseCommand));

    return allData;
  }
}

export const BADRRingService = new BADRRingServiceInstance();
