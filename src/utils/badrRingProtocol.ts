import base64 from 'react-native-base64'
import { FRAME_HEADER, FRAME_TAIL, CMD_TYPE_APP_TO_BLE, CMD_TYPE_BLE_TO_APP } from '../consts/badrRingConsts'

/**
 * Creates a command packet according to the BADR Ring protocol
 * 
 * @param commandType - Command type (01 for APP to BLE, 02 for BLE to APP)
 * @param command - Command code (e.g., 0100 for find ring)
 * @param parameter - Command parameter (optional)
 * @returns Base64 encoded command packet
 */
export const createCommandPacket = (
  commandType: string,
  command: string,
  parameter: string = ''
): string => {
  // Calculate parameter length (2 digits, pad with 0 if needed)
  const paramLength = parameter.length.toString(16).padStart(2, '0')
  
  // Construct the packet: Frame Header + Data Length + Command Type + Command + Parameter + Frame Tail
  const packet = `${FRAME_HEADER}${paramLength}${commandType}${command}${parameter}${FRAME_TAIL}`
  console.log('Creating packet:', { commandType, command, parameter, paramLength, packet })
  
  // Convert to Base64 for BLE transmission
  const encoded = base64.encode(packet)
  console.log('Encoded packet:', encoded)
  return encoded
}

/**
 * Creates a command packet from APP to Bluetooth
 * 
 * @param command - Command code (e.g., 0100 for find ring)
 * @param parameter - Command parameter (optional)
 * @returns Base64 encoded command packet
 */
export const createAppToBlePacket = (command: string, parameter: string = ''): string => {
  return createCommandPacket(CMD_TYPE_APP_TO_BLE, command, parameter)
}

/**
 * Creates a response packet from Bluetooth to APP
 * 
 * @param command - Command code to respond to
 * @param parameter - Response parameter (optional)
 * @returns Base64 encoded response packet
 */
export const createBleToAppPacket = (command: string, parameter: string = ''): string => {
  return createCommandPacket(CMD_TYPE_BLE_TO_APP, command, parameter)
}

/**
 * Creates a response packet from APP to Bluetooth (for acknowledgments)
 * 
 * @param command - Command code to respond to
 * @param success - Whether the operation was successful (1) or failed (0)
 * @returns Base64 encoded response packet
 */
export const createAppResponsePacket = (command: string, success: boolean): string => {
  return createCommandPacket(CMD_TYPE_BLE_TO_APP, command, success ? '1' : '0')
}

/**
 * Parses a received BLE packet
 * 
 * @param base64Data - Base64 encoded data received from BLE
 * @returns Parsed packet or null if invalid
 */
export const parsePacket = (base64Data: string | null): {
  frameHeader: string
  paramLength: number
  paramLengthHex: string
  commandType: string
  command: string
  parameter: string
  frameTail: string
} | null => {
  if (!base64Data) return null
  
  try {
    // Decode the Base64 data
    const data = base64.decode(base64Data)
    console.log('Decoding packet:', base64Data, '->', data, 'length:', data.length)
    
    // Check if the packet has the minimum required length and valid frame header/tail
    if (data.length < 10 || !data.startsWith(FRAME_HEADER) || !data.endsWith(FRAME_TAIL)) {
      console.log('Invalid packet structure:', data)
      return null
    }
    
    // Extract components
    const frameHeader = data.substring(0, 2) // DC
    const paramLengthHex = data.substring(2, 4) // e.g., 02
    const paramLength = parseInt(paramLengthHex, 16)
    const commandType = data.substring(4, 6) // e.g., 02
    const command = data.substring(6, 10) // e.g., 1505
    const parameter = data.substring(10, 10 + paramLength) // e.g., 85
    const frameTail = data.substring(data.length - 2) // LT
    
    console.log('Parsed packet components:', { frameHeader, paramLengthHex, paramLength, commandType, command, parameter, frameTail })
    
    return {
      frameHeader,
      paramLength,
      paramLengthHex,
      commandType,
      command,
      parameter,
      frameTail
    }
  } catch (error) {
    console.error('Error parsing BLE packet:', error)
    return null
  }
}

/**
 * Formats date for system time sync (format: YYYYMMDDHHMMSSw)
 * where w is weekday (0-6, Sunday is 0)
 * 
 * @param date - Date object to format
 * @returns Formatted date string
 */
export const formatDateForSync = (date: Date = new Date()): string => {
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  const seconds = date.getSeconds().toString().padStart(2, '0')
  const weekday = date.getDay() // 0-6, Sunday is 0
  
  return `${year}${month}${day}${hours}${minutes}${seconds}${weekday}`
}

/**
 * Formats prayer times for algorithm setting
 * 
 * @param times - Array of prayer times [fajr, dhuhr, asr, maghrib, isha]
 * @returns Formatted prayer times string
 */
export const formatPrayerTimes = (
  times: [string, string, string, string, string]
): string => {
  return times.map(time => {
    // Extract hours and minutes from time string (e.g., "05:30")
    const [hours, minutes] = time.split(':')
    return hours.padStart(2, '0') + minutes.padStart(2, '0')
  }).join('')
}

/**
 * Formats tasbih reminder settings
 * 
 * @param enabled - Whether reminders are enabled
 * @param startTime - Start time in 24h format (e.g., "06:00")
 * @param endTime - End time in 24h format (e.g., "21:00")
 * @param intervalMinutes - Interval in minutes
 * @returns Formatted reminder settings string
 */
export const formatTasbihReminder = (
  enabled: boolean,
  startTime: string,
  endTime: string,
  intervalMinutes: number
): string => {
  const [startHours, startMinutes] = startTime.split(':')
  const [endHours, endMinutes] = endTime.split(':')
  
  return `${enabled ? '1' : '0'}${startHours.padStart(2, '0')}${startMinutes.padStart(2, '0')}${endHours.padStart(2, '0')}${endMinutes.padStart(2, '0')}${intervalMinutes.toString().padStart(2, '0')}`
}

/**
 * Parses stored count data from BLE response
 * 
 * @param parameter - Parameter string from BLE response
 * @returns Parsed count data
 */
export const parseStoredCountData = (parameter: string): {
  index: number
  date: string
  count: number
} | null => {
  if (parameter.length < 14) return null
  
  try {
    const index = parseInt(parameter.substring(0, 2), 10)
    const year = parameter.substring(2, 6)
    const month = parameter.substring(6, 8)
    const day = parameter.substring(8, 10)
    const count = parseInt(parameter.substring(10), 10)
    
    return {
      index,
      date: `${year}-${month}-${day}`,
      count
    }
  } catch (error) {
    console.error('Error parsing stored count data:', error)
    return null
  }
}