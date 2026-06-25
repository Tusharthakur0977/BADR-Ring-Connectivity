import {
  BleError,
  BleErrorCode,
  BleManager,
  Device,
  State as BluetoothState,
  LogLevel,
  type DeviceId,
  type TransactionId,
  type UUID,
  type Characteristic,
  type Base64,
  type Subscription
} from 'react-native-ble-plx'
import { PermissionsAndroid, Platform } from 'react-native'
import Toast from 'react-native-toast-message'

const deviceNotConnectedErrorText = 'Device is not connected'

class BLEServiceInstance {
  manager: BleManager;

  device: Device | null;

  characteristicMonitor: Subscription | null;

  isCharacteristicMonitorDisconnectExpected = false;

  constructor() {
    this.device = null;
    this.characteristicMonitor = null;
    this.manager = new BleManager();
    this.manager.setLogLevel(LogLevel.Verbose);
  }

  createNewManager = () => {
    this.manager = new BleManager();
    this.manager.setLogLevel(LogLevel.Verbose);
  };

  getDevice = () => this.device;

  initializeBLE = () =>
    new Promise<void>((resolve) => {
      const subscription = this.manager.onStateChange((state) => {
        switch (state) {
          case BluetoothState.Unsupported:
            this.showErrorToast("");
            break;
          case BluetoothState.PoweredOff:
            this.onBluetoothPowerOff();
            this.manager.enable().catch((error: BleError) => {
              if (error.errorCode === BleErrorCode.BluetoothUnauthorized) {
                this.requestBluetoothPermission();
              }
            });
            break;
          case BluetoothState.Unauthorized:
            this.requestBluetoothPermission();
            break;
          case BluetoothState.PoweredOn:
            resolve();
            subscription.remove();
            break;
          default:
            console.error("Unsupported state: ", state);
          // resolve()
          // subscription.remove()
        }
      }, true);
    });

  disconnectDevice = () => {
    if (!this.device) {
      this.showErrorToast(deviceNotConnectedErrorText);
      throw new Error(deviceNotConnectedErrorText);
    }
    return this.manager
      .cancelDeviceConnection(this.device.id)
      .then(() => this.showSuccessToast("Device disconnected"))
      .catch((error) => {
        if (error?.code !== BleErrorCode.DeviceDisconnected) {
          this.onError(error);
        }
      });
  };

  disconnectDeviceById = (id: DeviceId) =>
    this.manager
      .cancelDeviceConnection(id)
      .then(() => this.showSuccessToast("Device disconnected"))
      .catch((error) => {
        if (error?.code !== BleErrorCode.DeviceDisconnected) {
          this.onError(error);
        }
      });

  onBluetoothPowerOff = () => {
    this.showErrorToast("Bluetooth is turned off");
  };

  scanDevices = async (
    onDeviceFound: (device: Device) => void,
    UUIDs: UUID[] | null = null,
    legacyScan?: boolean
  ) => {
    console.log(
      "BLEService.scanDevices called with UUIDs:",
      UUIDs,
      "legacyScan:",
      legacyScan
    );
    this.manager
      .startDeviceScan(UUIDs, { legacyScan }, (error, device) => {
        if (error) {
          this.onError(error);
          console.error("BLE scan error:", error.message);
          this.manager.stopDeviceScan();
          return;
        }
        if (device) {
          console.log("BLEService found device:", device.name, device.id);
          onDeviceFound(device);
        }
      })
      .then(() => {
        console.log("BLE scan started successfully");
      })
      .catch((error) => {
        console.error("Error starting BLE scan:", error);
      });
  };

  connectToDevice = (deviceId: DeviceId) =>
    new Promise<Device>((resolve, reject) => {
      this.manager.stopDeviceScan();

      // Add connection options with transport type
      const connectionOptions = {
        // Specify BLE transport type (important for Android)
        transportType: 1, // 1 = BLE, equivalent to TRANSPORT_LE
        autoConnect: false,
      };

      console.log(
        `Attempting to connect to device: ${deviceId} with options:`,
        connectionOptions
      );

      this.manager
        .connectToDevice(deviceId, connectionOptions)
        .then((device) => {
          console.log(`Connected to device: ${device.id}`);
          this.device = device;
          resolve(device);
        })
        .catch((error) => {
          console.error(`Connection error: ${error.message}`, error);
          if (
            error.errorCode === BleErrorCode.DeviceAlreadyConnected &&
            this.device
          ) {
            console.log("Device already connected, using existing connection");
            resolve(this.device);
          } else {
            this.onError(error);
            reject(error);
          }
        });
    });

  discoverAllServicesAndCharacteristicsForDevice = async () => {
    if (!this.device) {
      const error = new Error("Device is not connected");
      this.showErrorToast("Device is not connected");
      throw error;
    }

    console.log(`Discovering services for device: ${this.device.id}`);

    try {
      // Explicitly set a timeout for discovery
      const discoveryTimeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Service discovery timeout")), 10000);
      });

      const discoveryPromise =
        this.device.discoverAllServicesAndCharacteristics();

      // Race between discovery and timeout
      const device = await Promise.race([discoveryPromise, discoveryTimeout]);
      console.log(`Services discovered for device: ${this.device.id}`);

      // Log discovered services for debugging
      const services = await this.device.services();
      console.log(`Found ${services.length} services:`);
      for (const service of services) {
        console.log(`- Service: ${service.uuid}`);
        const characteristics = await service.characteristics();
        for (const char of characteristics) {
          console.log(
            `  - Characteristic: ${char.uuid}, properties: ${JSON.stringify(
              char
            )}`
          );
        }
      }

      return device;
    } catch (error: any) {
      console.error(`Error discovering services: ${error.message}`);
      this.showErrorToast(`Failed to discover services: ${error.message}`);
      throw error;
    }
  };

  readCharacteristicForDevice = async (
    serviceUUID: UUID,
    characteristicUUID: UUID
  ) =>
    new Promise<Characteristic>((resolve, reject) => {
      if (!this.device) {
        this.showErrorToast(deviceNotConnectedErrorText);
        reject(new Error(deviceNotConnectedErrorText));
        return;
      }
      this.manager
        .readCharacteristicForDevice(
          this.device.id,
          serviceUUID,
          characteristicUUID
        )
        .then((characteristic) => {
          resolve(characteristic);
        })
        .catch((error) => {
          this.onError(error);
        });
    });

  writeCharacteristicWithResponseForDevice = async (
    serviceUUID: UUID,
    characteristicUUID: UUID,
    time: Base64
  ) => {
    if (!this.device) {
      this.showErrorToast(deviceNotConnectedErrorText);
      throw new Error(deviceNotConnectedErrorText);
    }
    return this.manager
      .writeCharacteristicWithResponseForDevice(
        this.device.id,
        serviceUUID,
        characteristicUUID,
        time
      )
      .catch((error) => {
        this.onError(error);
      });
  };

  writeCharacteristicWithoutResponseForDevice = async (
    serviceUUID: UUID,
    characteristicUUID: UUID,
    time: Base64
  ) => {
    if (!this.device) {
      this.showErrorToast(deviceNotConnectedErrorText);
      throw new Error(deviceNotConnectedErrorText);
    }
    return this.manager
      .writeCharacteristicWithoutResponseForDevice(
        this.device.id,
        serviceUUID,
        characteristicUUID,
        time
      )
      .catch((error) => {
        this.onError(error);
      });
  };

  setupMonitor = (
    serviceUUID: UUID,
    characteristicUUID: UUID,
    onCharacteristicReceived: (characteristic: Characteristic) => void,
    onError: (error: Error) => void,
    transactionId?: TransactionId,
    hideErrorDisplay?: boolean
  ) => {
    if (!this.device) {
      this.showErrorToast(deviceNotConnectedErrorText);
      throw new Error(deviceNotConnectedErrorText);
    }
    this.characteristicMonitor = this.manager.monitorCharacteristicForDevice(
      this.device?.id,
      serviceUUID,
      characteristicUUID,
      (error, characteristic) => {
        if (error) {
          if (
            error.errorCode === 2 &&
            this.isCharacteristicMonitorDisconnectExpected
          ) {
            this.isCharacteristicMonitorDisconnectExpected = false;
            return;
          }
          onError(error);
          if (!hideErrorDisplay) {
            this.onError(error);
            this.characteristicMonitor?.remove();
          }
          return;
        }
        if (characteristic) {
          onCharacteristicReceived(characteristic);
        }
      },
      transactionId
    );
  };

  setupCustomMonitor: BleManager["monitorCharacteristicForDevice"] = (
    ...args
  ) => this.manager.monitorCharacteristicForDevice(...args);

  finishMonitor = () => {
    this.isCharacteristicMonitorDisconnectExpected = true;
    this.characteristicMonitor?.remove();
  };

  writeDescriptorForDevice = async (
    serviceUUID: UUID,
    characteristicUUID: UUID,
    descriptorUUID: UUID,
    data: Base64
  ) => {
    if (!this.device) {
      this.showErrorToast(deviceNotConnectedErrorText);
      throw new Error(deviceNotConnectedErrorText);
    }
    return this.manager
      .writeDescriptorForDevice(
        this.device.id,
        serviceUUID,
        characteristicUUID,
        descriptorUUID,
        data
      )
      .catch((error) => {
        this.onError(error);
      });
  };

  readDescriptorForDevice = async (
    serviceUUID: UUID,
    characteristicUUID: UUID,
    descriptorUUID: UUID
  ) => {
    if (!this.device) {
      this.showErrorToast(deviceNotConnectedErrorText);
      throw new Error(deviceNotConnectedErrorText);
    }
    return this.manager
      .readDescriptorForDevice(
        this.device.id,
        serviceUUID,
        characteristicUUID,
        descriptorUUID
      )
      .catch((error) => {
        this.onError(error);
      });
  };

  getServicesForDevice = () => {
    if (!this.device) {
      this.showErrorToast(deviceNotConnectedErrorText);
      throw new Error(deviceNotConnectedErrorText);
    }
    return this.manager.servicesForDevice(this.device.id).catch((error) => {
      this.onError(error);
    });
  };

  getCharacteristicsForDevice = (serviceUUID: UUID) => {
    if (!this.device) {
      this.showErrorToast(deviceNotConnectedErrorText);
      throw new Error(deviceNotConnectedErrorText);
    }
    return this.manager
      .characteristicsForDevice(this.device.id, serviceUUID)
      .catch((error) => {
        this.onError(error);
      });
  };

  getDescriptorsForDevice = (serviceUUID: UUID, characteristicUUID: UUID) => {
    if (!this.device) {
      this.showErrorToast(deviceNotConnectedErrorText);
      throw new Error(deviceNotConnectedErrorText);
    }
    return this.manager
      .descriptorsForDevice(this.device.id, serviceUUID, characteristicUUID)
      .catch((error) => {
        this.onError(error);
      });
  };

  isDeviceConnected = () => {
    if (!this.device) {
      this.showErrorToast(deviceNotConnectedErrorText);
      throw new Error(deviceNotConnectedErrorText);
    }
    return this.manager.isDeviceConnected(this.device.id);
  };

  isDeviceWithIdConnected = (id: DeviceId) =>
    this.manager.isDeviceConnected(id).catch(console.error);

  getConnectedDevices = (expectedServices: UUID[]) => {
    if (!this.device) {
      this.showErrorToast(deviceNotConnectedErrorText);
      throw new Error(deviceNotConnectedErrorText);
    }
    return this.manager.connectedDevices(expectedServices).catch((error) => {
      this.onError(error);
    });
  };

  requestMTUForDevice = (mtu: number) => {
    if (!this.device) {
      this.showErrorToast(deviceNotConnectedErrorText);
      throw new Error(deviceNotConnectedErrorText);
    }
    return this.manager
      .requestMTUForDevice(this.device.id, mtu)
      .catch((error) => {
        this.onError(error);
      });
  };

  onDeviceDisconnected = (
    listener: (error: BleError | null, device: Device | null) => void
  ) => {
    if (!this.device) {
      this.showErrorToast(deviceNotConnectedErrorText);
      throw new Error(deviceNotConnectedErrorText);
    }
    return this.manager.onDeviceDisconnected(this.device.id, listener);
  };

  onDeviceDisconnectedCustom: BleManager["onDeviceDisconnected"] = (...args) =>
    this.manager.onDeviceDisconnected(...args);

  readRSSIForDevice = () => {
    if (!this.device) {
      this.showErrorToast(deviceNotConnectedErrorText);
      throw new Error(deviceNotConnectedErrorText);
    }
    return this.manager.readRSSIForDevice(this.device.id).catch((error) => {
      this.onError(error);
    });
  };

  getDevices = () => {
    if (!this.device) {
      this.showErrorToast(deviceNotConnectedErrorText);
      throw new Error(deviceNotConnectedErrorText);
    }
    return this.manager.devices([this.device.id]).catch((error) => {
      this.onError(error);
    });
  };

  cancelTransaction = (transactionId: TransactionId) =>
    this.manager.cancelTransaction(transactionId);

  enable = () =>
    this.manager.enable().catch((error) => {
      this.onError(error);
    });

  disable = () =>
    this.manager.disable().catch((error) => {
      this.onError(error);
    });

  getState = () =>
    this.manager.state().catch((error) => {
      this.onError(error);
    });

  onError = (error: BleError) => {
    switch (error.errorCode) {
      case BleErrorCode.BluetoothUnauthorized:
        this.requestBluetoothPermission();
        break;
      case BleErrorCode.LocationServicesDisabled:
        this.showErrorToast("Location services are disabled");
        break;
      default:
        this.showErrorToast(JSON.stringify(error, null, 4));
    }
  };

  requestConnectionPriorityForDevice = (priority: 0 | 1 | 2) => {
    if (!this.device) {
      this.showErrorToast(deviceNotConnectedErrorText);
      throw new Error(deviceNotConnectedErrorText);
    }
    return this.manager.requestConnectionPriorityForDevice(
      this.device?.id,
      priority
    );
  };

  cancelDeviceConnection = () => {
    if (!this.device) {
      this.showErrorToast(deviceNotConnectedErrorText);
      throw new Error(deviceNotConnectedErrorText);
    }
    return this.manager.cancelDeviceConnection(this.device?.id);
  };

  requestBluetoothPermission = async () => {
    if (Platform.OS === "ios") {
      return true;
    }
    if (Platform.OS === "android") {
      const apiLevel = parseInt(Platform.Version.toString(), 10);

      if (apiLevel >= 31) {
        // Android 12+ requires BLUETOOTH_SCAN and BLUETOOTH_CONNECT
        const scanGranted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN
        );
        const connectGranted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT
        );
        return (
          scanGranted === PermissionsAndroid.RESULTS.GRANTED &&
          connectGranted === PermissionsAndroid.RESULTS.GRANTED
        );
      } else if (
        apiLevel < 31 &&
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      ) {
        // Android 6-11 requires location permission for BLE
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
    }
    return false;
  };

  showErrorToast = (error: string) => {
    Toast.show({
      type: "error",
      text1: "Error",
      text2: error,
    });
    console.error(error);
  };

  showSuccessToast = (info: string) => {
    Toast.show({
      type: "success",
      text1: "Success",
      text2: info,
    });
  };
}

export const BLEService = new BLEServiceInstance()
