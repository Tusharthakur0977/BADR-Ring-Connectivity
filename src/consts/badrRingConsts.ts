import { fullUUID } from 'react-native-ble-plx'

// BADR Ring BLE specifications
export const BADR_RING_NAME = "BADR Ring";

// Service and Characteristic UUIDs
export const BADR_SERVICE_UUID = fullUUID('DC00')
export const BADR_REPORT_CHARACTERISTIC_UUID = fullUUID('DC01')
export const BADR_WRITE_CHARACTERISTIC_UUID = fullUUID('DC02')

// Protocol constants
export const FRAME_HEADER = 'DC'
export const FRAME_TAIL = 'LT'

// Command Types
export const CMD_TYPE_APP_TO_BLE = '01'
export const CMD_TYPE_BLE_TO_APP = '02'

// Command Parameters: APP → Bluetooth
export const CMD = {
  // Settings
  FIND_RING: '0100',
  SCREEN_ROTATION: '0200',
  SET_PRAYER_TIME_ALGORITHM: '0300',
  SET_CUSTOM_COUNT_VIBRATION: '0400',
  RESTORE_DEFAULT_COUNT_VIBRATION: '0401',
  LANGUAGE_SWITCH: '0700',
  SCREEN_BRIGHTNESS: '0800',
  TASBIH_REMINDER_SETTING: '0900',

  // Other Operations
  GET_BLE_SOFTWARE_VERSION: '0500',
  GET_BLE_BATTERY_LEVEL: '0501',
  GET_BLE_SETTINGS: '0502',
  SYNC_SYSTEM_TIME: '0503',
  GET_STORED_COUNT_DATA: '0505',
  GET_CHARGING_STATUS: '0506',
  RESTORE_FACTORY_SETTINGS: '0507',

  // Hardware Test
  POWER_OFF_BLE_DEVICE: '0602',
}

// Command Parameters: Bluetooth → APP
export const BLE_CMD = {
  // Heart Rate Data
  REPORT_STORED_DAILY_COUNTS: '1100',
  REPORT_COMPLETE: '1101',
  REPORT_REALTIME_COUNT: '1102',
  REPORT_COUNT_RESET: '1103',

  // Charging Status
  CHARGER_UNPLUGGED: '1500',
  CHARGER_PLUGGED_IN: '1501',
  FULLY_CHARGED: '1502',
  REPORT_CHARGE_LEVEL: '1505',

  // OTA Status
  OTA_START: '1700',
  OTA_STOP: '1701',
  OTA_SUCCESS: '1702',
}

// Response values
export const RESPONSE = {
  SUCCESS: '1',
  FAILURE: '0',
}

// OTA stop reasons
export const OTA_STOP_REASON = {
  TIMEOUT: '0',
  ADDRESS_ERROR: '1',
  VALIDATION_FAIL: '2',
}
