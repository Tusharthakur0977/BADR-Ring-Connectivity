import base64 from 'react-native-base64';
import { Base64, Device } from 'react-native-ble-plx';
import { BADR_REPORT_CHARACTERISTIC_UUID, BADR_RING_NAME, BADR_SERVICE_UUID, BADR_WRITE_CHARACTERISTIC_UUID, BLE_CMD, CMD } from '../../consts/badrRingConsts';
import { createBleToAppPacket, parsePacket } from '../../utils/badrRingProtocol';

let mockBADRRingDevice: any = null;
try {
  mockBADRRingDevice = require('./MockBADRRingDevice').mockBADRRingDevice;
} catch (error) {
  console.error("Failed to import mockBADRRingDevice:", error);
  // Fallback mock implementation with valid Bluetooth MAC address
  mockBADRRingDevice = {
    isRunning: () => true,
    getDeviceId: () => "00:11:22:33:44:55",
    getDeviceName: () => BADR_RING_NAME,
    processCommand: (_data: string) => "DC0002010001LT", // Updated to use type 02
  };
}

class MockBLEAdapter {
  private isEnabled: boolean = false

  enable() {
    this.isEnabled = true
    console.log('Mock BLE adapter enabled')
  }

  disable() {
    this.isEnabled = false
    console.log('Mock BLE adapter disabled')
  }

  isAdapterEnabled(): boolean {
    return this.isEnabled
  }

  isRunning(): boolean {
    return this.isEnabled && mockBADRRingDevice.isRunning()
  }

  interceptScan(onDeviceFound: (device: Device) => void) {
    console.log("MockBLEAdapter.interceptScan called");
    console.log("Adapter enabled:", this.isEnabled);
    console.log("Mock device running:", mockBADRRingDevice.isRunning());

    // Auto-enable the adapter if the mock device is running but adapter is not enabled
    if (!this.isEnabled && mockBADRRingDevice.isRunning()) {
      console.log("Auto-enabling mock adapter because mock device is running");
      this.enable();
    }

    if (!this.isEnabled || !mockBADRRingDevice.isRunning()) {
      console.log("Mock adapter not enabled or mock device not running");
      return false;
    }

    console.log("Creating mock device for scan");
    const mockDevice = {
      id: mockBADRRingDevice.getDeviceId(),
      name: mockBADRRingDevice.getDeviceName(),
      localName: mockBADRRingDevice.getDeviceName(),
      rssi: -65,
      mtu: 23,
      manufacturerData: null,
      serviceData: {},
      serviceUUIDs: [BADR_SERVICE_UUID],
      txPowerLevel: null,
      solicitedServiceUUIDs: null,
      isConnectable: true,
      overflowServiceUUIDs: null,
      rawScanRecord: null,
    } as unknown as Device;

    console.log("Mock device created:", mockDevice.name, mockDevice.id);
    setTimeout(() => {
      console.log("Sending mock device to callback");
      onDeviceFound(mockDevice);
    }, 1000);

    return true;
  }

  interceptConnect(deviceId: string): boolean {
    if (!this.isEnabled || !mockBADRRingDevice.isRunning()) {
      return false
    }
    return deviceId === mockBADRRingDevice.getDeviceId()
  }

  interceptWrite(
    deviceId: string,
    serviceUUID: string,
    characteristicUUID: string,
    data: Base64
  ): Base64 | null {
    console.log('MockBLEAdapter.interceptWrite called')
    console.log('Adapter enabled:', this.isEnabled)
    console.log('Device ID:', deviceId)
    console.log('Service UUID:', serviceUUID)
    console.log('Characteristic UUID:', characteristicUUID)
    console.log('Data:', data)



    if (!this.isEnabled) {
      console.log('Mock adapter not enabled')
      return null
    }

    if (
      serviceUUID === BADR_SERVICE_UUID &&
      characteristicUUID === BADR_WRITE_CHARACTERISTIC_UUID
    ) {
      console.log('Processing command with mock device')
      try {
        const packet = parsePacket(data)
        console.log(packet, 'SSSSSPSPSPPS');

        if (packet) {
          console.log('Parsed packet:', packet)
          let response: Base64;
          // Use the mock device's processCommand method to handle the command
          // This will use all the dynamic values set in the simulator
          const processedResponse = mockBADRRingDevice.processCommand(data);
          if (processedResponse) {
            console.log('Using response from mockBADRRingDevice:', processedResponse);
            return processedResponse;
          }

          // Fallback handling if processCommand didn't return a response
          switch (packet.command) {
            case CMD.GET_BLE_BATTERY_LEVEL:
              console.log('Creating battery response')
              response = createBleToAppPacket(BLE_CMD.REPORT_CHARGE_LEVEL, mockBADRRingDevice.getBatteryLevel().toString())
              break
            case CMD.GET_STORED_COUNT_DATA:
              console.log('Creating count data response')
              // Format: count + date in YYYYMMDD format
              const today = new Date();
              const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
              response = createBleToAppPacket(BLE_CMD.REPORT_STORED_DAILY_COUNTS, `${mockBADRRingDevice.getCount()}${dateStr}`)
              break
            case CMD.GET_BLE_SETTINGS:
              console.log('Creating settings response')
              // This will be handled by the mockBADRRingDevice's processCommand method
              response = createBleToAppPacket(CMD.GET_BLE_SETTINGS, '50509120915191741') // Fallback
              break
            case CMD.GET_BLE_SOFTWARE_VERSION:
              console.log('Creating version response')
              response = createBleToAppPacket(CMD.GET_BLE_SOFTWARE_VERSION, '1.2.3')
              break
            case CMD.GET_CHARGING_STATUS:
              console.log('Creating charging status response')
              response = createBleToAppPacket(BLE_CMD.CHARGER_PLUGGED_IN, mockBADRRingDevice.isDeviceCharging() ? '1' : '0')
              break
            default:
              console.log('Unsupported command:', packet.command)
              response = createBleToAppPacket('0100', '1')
              break
          }
          console.log('Created response:', response)
          return response
        } else {
          console.log('Failed to parse packet')
        }
      } catch (error) {
        console.error('Error processing command:', error)
      }
      return base64.encode('DC000201001LT')
    }

    console.log('No matching service/characteristic for mock device')
    return null
  }

  interceptRead(
    deviceId: string,
    serviceUUID: string,
    characteristicUUID: string
  ): Base64 | null {
    if (!this.isEnabled || !mockBADRRingDevice.isRunning()) {
      return null
    }
    if (
      deviceId === mockBADRRingDevice.getDeviceId() &&
      serviceUUID === BADR_SERVICE_UUID &&
      characteristicUUID === BADR_REPORT_CHARACTERISTIC_UUID
    ) {
      return base64.encode('DC00020100LT')
    }
    return null
  }
}

export const mockBLEAdapter = new MockBLEAdapter()
