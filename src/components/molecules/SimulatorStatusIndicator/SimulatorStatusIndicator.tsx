import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { mockBADRRingDevice } from '../../../services/BLEService/MockBADRRingDevice'
import { mockBLEAdapter } from '../../../services/BLEService/MockBLEAdapter'

/**
 * A component that shows the current status of the BADR Ring simulator
 */
export function SimulatorStatusIndicator() {
  const [isDeviceRunning, setIsDeviceRunning] = useState(false)
  const [isAdapterEnabled, setIsAdapterEnabled] = useState(false)
  
  // Check the status every second
  useEffect(() => {
    const interval = setInterval(() => {
      setIsDeviceRunning(mockBADRRingDevice.isRunning())
      setIsAdapterEnabled(mockBLEAdapter.isAdapterEnabled())
    }, 1000)
    
    return () => clearInterval(interval)
  }, [])
  
  // Don't render anything if both are inactive
  if (!isDeviceRunning && !isAdapterEnabled) {
    return null
  }
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Simulator Status</Text>
      <Text style={[styles.status, isDeviceRunning ? styles.active : styles.inactive]}>
        Device: {isDeviceRunning ? 'ACTIVE' : 'INACTIVE'}
      </Text>
      <Text style={[styles.status, isAdapterEnabled ? styles.active : styles.inactive]}>
        Adapter: {isAdapterEnabled ? 'ENABLED' : 'DISABLED'}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 10,
    borderRadius: 5,
    zIndex: 1000,
  },
  title: {
    color: 'white',
    fontWeight: 'bold',
    marginBottom: 5,
  },
  status: {
    color: 'white',
  },
  active: {
    color: '#4CAF50',
  },
  inactive: {
    color: '#F44336',
  },
})
