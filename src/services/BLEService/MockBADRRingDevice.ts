import base64 from 'react-native-base64'
import { BADR_RING_NAME, CMD, CMD_TYPE_BLE_TO_APP, BLE_CMD } from '../../consts/badrRingConsts'
import { parsePacket, createBleToAppPacket } from '../../utils/badrRingProtocol'

/**
 * This class creates a mock BADR Ring device that can be used for testing
 * without having the actual hardware.
 */
class MockBADRRingDevice {
  private isActive: boolean = false;
  private mockDeviceId: string = "00:11:22:33:44:55"; // Valid Bluetooth MAC address format
  private mockDeviceName: string = BADR_RING_NAME;
  private batteryLevel: number = 85;
  private count: number = 0;
  private brightness: number = 5;
  private language: string = "English";
  private isCharging: boolean = false;
  private prayerTimes: string = "05:00,12:15,16:31,18:11,19:23";
  private reminderEnabled: boolean = true;
  private reminderStartTime: string = "06:00";
  private reminderEndTime: string = "21:00";
  private reminderInterval: number = 20;
  private commandHandlers: Map<string, (data: string) => string> = new Map();

  // Custom simulator values
  private customSoftwareVersion: string = "1.2.3";
  private customStoredCountData: string = "";
  private customBleSettings: string = "";
  private customVibrationSettings: string = "";

  /**
   * Start the mock device
   */
  start() {
    console.log("MockBADRRingDevice.start called");
    this.isActive = true;
    console.log(
      "Mock BADR Ring device started with ID:",
      this.mockDeviceId,
      "and name:",
      this.mockDeviceName
    );
    console.log("Initial state:", this.getState());

    // Register command handlers
    this.setupCommandHandlers();

    return {
      id: this.mockDeviceId,
      name: this.mockDeviceName,
      isCharging: this.isCharging,
    };
  }

  /**
   * Send all device data to the app
   * This simulates what happens when the app connects to a real device
   *
   * @returns Array of response packets
   */
  sendAllDataToApp(): string[] {
    console.log("MockBADRRingDevice.sendAllDataToApp called");
    if (!this.isActive) {
      console.log("Mock device not active, cannot send data");
      return [];
    }

    const responses: string[] = [];

    // Send battery level
    const batteryResponse = createBleToAppPacket(
      BLE_CMD.REPORT_CHARGE_LEVEL,
      this.batteryLevel.toString()
    );
    responses.push(batteryResponse);

    // Send software version - use custom version if available
    const softwareVersion = this.customSoftwareVersion || "1.2.3";
    const versionResponse = createBleToAppPacket(
      CMD.GET_BLE_SOFTWARE_VERSION,
      softwareVersion
    );
    responses.push(versionResponse);

    // Send settings - use custom settings if available
    if (this.customBleSettings) {
      const settingsResponse = createBleToAppPacket(
        CMD.GET_BLE_SETTINGS,
        this.customBleSettings
      );
      responses.push(settingsResponse);
    } else {
      // Use default settings
      const formattedPrayerTimes = this.prayerTimes
        .split(",")
        .map((time) => time.replace(":", ""))
        .join("");

      const settings = `${this.brightness}${formattedPrayerTimes}${
        this.reminderEnabled ? "1" : "0"
      }${this.reminderStartTime.replace(":", "")}${this.reminderEndTime.replace(
        ":",
        ""
      )}${this.reminderInterval.toString().padStart(2, "0")}`;
      const settingsResponse = createBleToAppPacket(
        CMD.GET_BLE_SETTINGS,
        settings
      );
      responses.push(settingsResponse);
    }

    // Send charging status
    const chargingResponse = createBleToAppPacket(
      BLE_CMD.CHARGER_PLUGGED_IN,
      this.isCharging ? "1" : "0"
    );
    responses.push(chargingResponse);

    // Send count data - use custom data if available
    if (this.customStoredCountData) {
      const countResponse = createBleToAppPacket(
        BLE_CMD.REPORT_STORED_DAILY_COUNTS,
        this.customStoredCountData
      );
      responses.push(countResponse);
    } else {
      // Use default count data
      const countResponse = createBleToAppPacket(
        BLE_CMD.REPORT_STORED_DAILY_COUNTS,
        `0020230516${this.count + 10}`
      );
      responses.push(countResponse);
    }

    // Send vibration settings if available
    if (this.customVibrationSettings) {
      const vibrationResponse = createBleToAppPacket(
        CMD.SET_CUSTOM_COUNT_VIBRATION,
        this.customVibrationSettings
      );
      responses.push(vibrationResponse);
    }

    console.log("Generated responses:", responses);
    return responses;
  }

  /**
   * Stop the mock device
   */
  stop() {
    this.isActive = false;
    console.log("Mock BADR Ring device stopped");
    console.log("Final state:", this.getState());
  }

  /**
   * Check if the mock device is active
   */
  isRunning(): boolean {
    return this.isActive;
  }

  /**
   * Get the current state of all properties
   */
  getState(): object {
    return {
      isActive: this.isActive,
      batteryLevel: this.batteryLevel,
      count: this.count,
      brightness: this.brightness,
      language: this.language,
      isCharging: this.isCharging,
      mockDeviceId: this.mockDeviceId,
      mockDeviceName: this.mockDeviceName,
      prayerTimes: this.prayerTimes,
      reminderEnabled: this.reminderEnabled,
      reminderStartTime: this.reminderStartTime,
      reminderEndTime: this.reminderEndTime,
      reminderInterval: this.reminderInterval,
    };
  }

  /**
   * Set up handlers for different commands
   */
  private setupCommandHandlers() {
    // Handler for getting battery level
    this.commandHandlers.set(CMD.GET_BLE_BATTERY_LEVEL, () => {
      console.log(
        `Handling GET_BLE_BATTERY_LEVEL, batteryLevel: ${this.batteryLevel}`
      );
      return createBleToAppPacket(
        BLE_CMD.REPORT_CHARGE_LEVEL,
        this.batteryLevel.toString()
      );
    });

    // Handler for setting battery level
    // this.commandHandlers.set(CMD.SET_BLE_BATTERY_LEVEL, (parameter) => {
    //   const level = parseInt(parameter, 10)
    //   if (level >= 0 && level <= 100) {
    //     this.setBatteryLevel(level)
    //     console.log(`SET_BLE_BATTERY_LEVEL: Battery level set to ${level}%`)
    //     return this.createSuccessResponse(CMD.SET_BLE_BATTERY_LEVEL)
    //   } else {
    //     console.log('SET_BLE_BATTERY_LEVEL: Invalid battery level:', parameter)
    //     return this.createFailureResponse(CMD.SET_BLE_BATTERY_LEVEL)
    //   }
    // })

    // Handler for getting charging status
    this.commandHandlers.set(CMD.GET_CHARGING_STATUS, () => {
      console.log(
        `Handling GET_CHARGING_STATUS, isCharging: ${this.isCharging}`
      );
      return createBleToAppPacket(
        BLE_CMD.CHARGER_PLUGGED_IN,
        this.isCharging ? "1" : "0"
      );
    });

    // Handler for finding the ring
    this.commandHandlers.set(CMD.FIND_RING, () => {
      console.log("FIND_RING: Ring is vibrating!");
      return this.createSuccessResponse(CMD.FIND_RING);
    });

    // Handler for screen rotation
    this.commandHandlers.set(CMD.SCREEN_ROTATION, () => {
      console.log("SCREEN_ROTATION: Screen rotated");
      return this.createSuccessResponse(CMD.SCREEN_ROTATION);
    });

    // Handler for getting stored count data
    this.commandHandlers.set(CMD.GET_STORED_COUNT_DATA, () => {
      // If custom stored count data is provided, use it
      if (this.customStoredCountData) {
        console.log(
          "GET_STORED_COUNT_DATA: Returning custom data:",
          this.customStoredCountData
        );
        // Just return success, the actual data will be sent in a separate notification
        return this.createSuccessResponse(CMD.GET_STORED_COUNT_DATA);
      }

      console.log(
        "GET_STORED_COUNT_DATA: Returning success, count:",
        this.count
      );
      return this.createSuccessResponse(CMD.GET_STORED_COUNT_DATA);
    });

    // Handler for setting screen brightness
    this.commandHandlers.set(CMD.SCREEN_BRIGHTNESS, (parameter) => {
      const level = parseInt(parameter, 10);
      if (level >= 1 && level <= 9) {
        this.brightness = level;
        console.log(`SCREEN_BRIGHTNESS: Brightness set to ${level}`);
        return this.createSuccessResponse(CMD.SCREEN_BRIGHTNESS);
      } else {
        console.log("SCREEN_BRIGHTNESS: Invalid brightness level:", parameter);
        return this.createFailureResponse(CMD.SCREEN_BRIGHTNESS);
      }
    });

    // Handler for syncing time
    this.commandHandlers.set(CMD.SYNC_SYSTEM_TIME, (parameter) => {
      console.log(`SYNC_SYSTEM_TIME: Time synced: ${parameter}`);
      return this.createSuccessResponse(CMD.SYNC_SYSTEM_TIME);
    });

    // Handler for getting settings
    this.commandHandlers.set(CMD.GET_BLE_SETTINGS, () => {
      // If custom settings are provided, use them
      if (this.customBleSettings) {
        console.log(
          "GET_BLE_SETTINGS: Returning custom settings:",
          this.customBleSettings
        );
        return createBleToAppPacket(
          CMD.GET_BLE_SETTINGS,
          this.customBleSettings
        );
      }

      // Otherwise format settings string based on current values
      // Format: brightness + prayerTimes + reminderEnabled + reminderStartTime + reminderEndTime + reminderInterval
      const formattedPrayerTimes = this.prayerTimes
        .split(",")
        .map((time) => time.replace(":", ""))
        .join("");

      // Create settings string in the expected format
      const settings = `${this.brightness}${formattedPrayerTimes}${
        this.reminderEnabled ? "1" : "0"
      }${this.reminderStartTime.replace(":", "")}${this.reminderEndTime.replace(
        ":",
        ""
      )}${this.reminderInterval.toString().padStart(2, "0")}`;

      console.log("GET_BLE_SETTINGS: Returning settings:", settings);
      return createBleToAppPacket(CMD.GET_BLE_SETTINGS, settings);
    });

    // Handler for getting software version
    this.commandHandlers.set(CMD.GET_BLE_SOFTWARE_VERSION, () => {
      const version = this.customSoftwareVersion || "1.2.3";
      console.log(`GET_BLE_SOFTWARE_VERSION: Returning version: ${version}`);
      return createBleToAppPacket(CMD.GET_BLE_SOFTWARE_VERSION, version);
    });
  }

  /**
   * Process a command received from the app
   *
   * @param base64Data - Base64 encoded command data
   * @returns Response data or null
   */
  processCommand(base64Data: string): string | null {
    console.log(
      "MockBADRRingDevice.processCommand called with data:",
      base64Data
    );
    console.log("State before command:", this.getState());

    if (!this.isActive) {
      console.log("Mock device not active");
      return null;
    }

    const packet = parsePacket(base64Data);
    if (!packet) {
      console.error("Invalid packet received by mock device");
      return null;
    }

    console.log(
      `Mock device received command: ${packet.command}, parameter: ${packet.parameter}`
    );

    // Find and execute the handler for this command
    const handler = this.commandHandlers.get(packet.command);
    if (handler) {
      console.log("Found handler for command:", packet.command);
      const response = handler(packet.parameter);
      console.log("State after command:", this.getState());
      return response;
    }

    // Default response for unknown commands
    console.log(
      "No handler found for command, sending default success response"
    );
    console.log("State after command:", this.getState());
    return this.createSuccessResponse(packet.command);
  }

  /**
   * Create a success response packet
   *
   * @param command - Command to respond to
   * @returns Base64 encoded response
   */
  private createSuccessResponse(command: string): string {
    return createBleToAppPacket(command, "1");
  }

  /**
   * Create a failure response packet
   *
   * @param command - Command to respond to
   * @returns Base64 encoded response
   */
  private createFailureResponse(command: string): string {
    return createBleToAppPacket(command, "0");
  }

  /**
   * Get the mock device ID
   */
  getDeviceId(): string {
    return this.mockDeviceId;
  }

  /**
   * Get the mock device name
   */
  getDeviceName(): string {
    return this.mockDeviceName;
  }

  /**
   * Increment the counter
   */
  incrementCount(): number {
    this.count++;
    console.log(`Incremented count to ${this.count}`);
    return this.count;
  }

  /**
   * Reset the counter
   */
  resetCount(): void {
    console.log(`Resetting count from ${this.count} to 0`);
    this.count = 0;
  }

  /**
   * Get the current count
   */
  getCount(): number {
    return this.count;
  }

  /**
   * Set the battery level
   */
  setBatteryLevel(level: number): void {
    const previousLevel = this.batteryLevel;
    this.batteryLevel = Math.min(100, Math.max(0, level));
    console.log(
      `Battery level changed from ${previousLevel}% to ${this.batteryLevel}%`
    );
  }

  /**
   * Get the battery level
   */
  getBatteryLevel(): number {
    return this.batteryLevel;
  }

  /**
   * Get the charging state
   */
  isDeviceCharging(): boolean {
    return this.isCharging;
  }

  /**
   * Set the charging state
   */
  setChargingStatus(isCharging: boolean): void {
    this.isCharging = isCharging;
    console.log(
      `Charging status changed to ${isCharging ? "charging" : "not charging"}`
    );
  }

  /**
   * Set the brightness level
   */
  setBrightness(level: number): void {
    this.brightness = Math.min(9, Math.max(1, level));
    console.log(`Brightness level set to ${this.brightness}`);
  }

  /**
   * Set the language
   */
  setLanguage(language: string): void {
    this.language = language;
    console.log(`Language set to ${language}`);
  }

  /**
   * Set the prayer times
   */
  setPrayerTimes(times: string): void {
    this.prayerTimes = times;
    console.log(`Prayer times set to ${times}`);
  }

  /**
   * Set the reminder enabled state
   */
  setReminderEnabled(enabled: boolean): void {
    this.reminderEnabled = enabled;
    console.log(`Reminder ${enabled ? "enabled" : "disabled"}`);
  }

  /**
   * Set the reminder start time
   */
  setReminderStartTime(time: string): void {
    this.reminderStartTime = time;
    console.log(`Reminder start time set to ${time}`);
  }

  /**
   * Set the reminder end time
   */
  setReminderEndTime(time: string): void {
    this.reminderEndTime = time;
    console.log(`Reminder end time set to ${time}`);
  }

  /**
   * Set the reminder interval
   */
  setReminderInterval(interval: number): void {
    this.reminderInterval = interval;
    console.log(`Reminder interval set to ${interval} minutes`);
  }

  /**
   * Set custom software version
   */
  setCustomSoftwareVersion(version: string): void {
    this.customSoftwareVersion = version;
    console.log(`Custom software version set to ${version}`);
  }

  /**
   * Set custom stored count data
   */
  setCustomStoredCountData(data: string): void {
    this.customStoredCountData = data;
    console.log(`Custom stored count data set to ${data}`);
  }

  /**
   * Set custom BLE settings
   */
  setCustomBleSettings(settings: string): void {
    this.customBleSettings = settings;
    console.log(`Custom BLE settings set to ${settings}`);
  }

  /**
   * Set custom vibration settings
   */
  setCustomVibrationSettings(settings: string): void {
    this.customVibrationSettings = settings;
    console.log(`Custom vibration settings set to ${settings}`);
  }

  /**
   * Get custom software version
   */
  getCustomSoftwareVersion(): string {
    return this.customSoftwareVersion;
  }

  /**
   * Get custom stored count data
   */
  getCustomStoredCountData(): string {
    return this.customStoredCountData;
  }

  /**
   * Get custom BLE settings
   */
  getCustomBleSettings(): string {
    return this.customBleSettings;
  }

  /**
   * Get custom vibration settings
   */
  getCustomVibrationSettings(): string {
    return this.customVibrationSettings;
  }
}

export const mockBADRRingDevice = new MockBADRRingDevice()