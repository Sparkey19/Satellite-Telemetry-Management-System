export type TelemetryInput = {
  satelliteId: string;
  timestamp?: string;
  temperature: number;
  batteryVoltage: number;
  signalStrength: number;
  latitude?: number;
  longitude?: number;
  altitude?: number;
  payload?: Record<string, unknown>;
};

export type TelemetryRecord = TelemetryInput & { id: number; timestamp: string };
