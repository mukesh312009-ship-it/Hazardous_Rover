import React, { useState } from 'react';
import { 
  X, 
  Cpu, 
  Layers, 
  Wifi, 
  ShieldCheck, 
  Code, 
  Server, 
  AlertTriangle, 
  Check, 
  Copy, 
  CheckCircle2,
  ExternalLink
} from 'lucide-react';

interface SystemArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SystemArchitectureModal: React.FC<SystemArchitectureModalProps> = ({
  isOpen,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'PIPELINE' | 'BOM' | 'MQTT'>('PIPELINE');
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  const sampleJsonSchema = `{
  "rover_id": "HAZARDSCOUT-01",
  "timestamp": 1729851600,
  "telemetry": {
    "oxygen_pct": 20.85,
    "h2s_ppm": 0.4,
    "co_ppm": 3.2,
    "temperature_c": 23.4,
    "humidity_rh": 61.2,
    "water_detected": false,
    "obstacle_distance_cm": 84,
    "battery_pct": 94.2,
    "wifi_rssi_dbm": -68
  },
  "firmware_version": "v1.2.4-esp32"
}`;

  const sampleEsp32Code = `// ESP32 Arduino - HazardScout Telemetry Publisher (FreeRTOS)
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

const char* ssid = "FIELD_AP_HAZARDSCOUT";
const char* password = "YOUR_WIFI_SECRET"; // Injected via compile-time env
const char* mqtt_server = "192.168.4.1";

WiFiClient espClient;
PubSubClient client(espClient);

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  client.setServer(mqtt_server, 1883);
}

void loop() {
  if (!client.connected()) reconnect();
  client.loop();

  StaticJsonDocument<256> doc;
  doc["rover_id"] = "HAZARDSCOUT-01";
  doc["timestamp"] = millis() / 1000;
  
  JsonObject tel = doc.createNestedObject("telemetry");
  tel["oxygen_pct"] = readO2Electrochemical();       // DFRobot SEN0322
  tel["temperature_c"] = sht31.readTemperature();    // DFRobot SEN0334
  tel["humidity_rh"] = sht31.readHumidity();
  tel["water_detected"] = (digitalRead(FC37_PIN) == LOW);
  tel["obstacle_distance_cm"] = readUltrasonic();    // HC-SR04
  tel["battery_pct"] = readBatteryVoltage();

  char buffer[256];
  serializeJson(doc, buffer);
  client.publish("hazardscout/telemetry", buffer);
  delay(1000);
}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(sampleEsp32Code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#0b1220] border border-cyan-500/40 rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden font-mono">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#0e1626] border-b border-hazard-border">
          <div className="flex items-center space-x-2.5">
            <Cpu className="w-5 h-5 text-cyan-400" />
            <div>
              <h2 className="text-sm font-bold text-slate-100 tracking-wider">
                HAZARDSCOUT SYSTEM ARCHITECTURE & INTEGRATION
              </h2>
              <p className="text-[10px] text-slate-400 font-sans">
                Hardware Specification, IoT Telemetry Pipeline & ESP32 MQTT Protocol
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-hazard-border bg-[#080d17] px-4 text-xs">
          <button
            onClick={() => setActiveTab('PIPELINE')}
            className={`py-2.5 px-3 border-b-2 font-bold transition flex items-center space-x-1.5 ${
              activeTab === 'PIPELINE'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-950/30'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>ARCHITECTURE PIPELINE</span>
          </button>

          <button
            onClick={() => setActiveTab('BOM')}
            className={`py-2.5 px-3 border-b-2 font-bold transition flex items-center space-x-1.5 ${
              activeTab === 'BOM'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-950/30'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>HARDWARE BOM vs SIMULATION</span>
          </button>

          <button
            onClick={() => setActiveTab('MQTT')}
            className={`py-2.5 px-3 border-b-2 font-bold transition flex items-center space-x-1.5 ${
              activeTab === 'MQTT'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-950/30'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>ESP32 MQTT PROTOCOL</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs text-slate-300">
          {/* TAB 1: ARCHITECTURE PIPELINE */}
          {activeTab === 'PIPELINE' && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-cyan-950/30 border border-cyan-500/30">
                <h3 className="font-bold text-cyan-300 mb-1 flex items-center gap-1.5">
                  <Server className="w-4 h-4 text-cyan-400" />
                  END-TO-END TELEMETRY & DECISION FLOW
                </h3>
                <p className="text-[11px] text-slate-300 font-sans">
                  The HazardScout rover functions as an autonomous scout before human personnel entry. Below is the full pipeline from physical or simulated transducers through the decision engine.
                </p>
              </div>

              {/* Step Flow Diagram */}
              <div className="grid grid-cols-1 md:grid-cols-6 gap-2 text-center text-[10px]">
                <div className="p-2.5 rounded bg-slate-900 border border-slate-700 flex flex-col justify-between">
                  <div className="font-bold text-cyan-400">1. TRANSDUCERS</div>
                  <div className="my-1.5 text-slate-300">O2, H2S, CO, SHT31, FC-37, HC-SR04</div>
                  <div className="text-[9px] text-slate-500">I2C / ADC / GPIO</div>
                </div>

                <div className="p-2.5 rounded bg-slate-900 border border-slate-700 flex flex-col justify-between">
                  <div className="font-bold text-cyan-400">2. ESP32 MCU</div>
                  <div className="my-1.5 text-slate-300">DevKit V1 Dual Core, FreeRTOS Sampling</div>
                  <div className="text-[9px] text-slate-500">1000ms Loop Filter</div>
                </div>

                <div className="p-2.5 rounded bg-slate-900 border border-slate-700 flex flex-col justify-between">
                  <div className="font-bold text-cyan-400">3. TELEMETRY</div>
                  <div className="my-1.5 text-slate-300">MQTT over 2.4GHz Wi-Fi / LoRa</div>
                  <div className="text-[9px] text-slate-500">QoS 1 JSON Payloads</div>
                </div>

                <div className="p-2.5 rounded bg-slate-900 border border-slate-700 flex flex-col justify-between">
                  <div className="font-bold text-cyan-400">4. DASHBOARD</div>
                  <div className="my-1.5 text-slate-300">React + TS Command Center</div>
                  <div className="text-[9px] text-slate-500">Canvas & Live Oscilloscope</div>
                </div>

                <div className="p-2.5 rounded bg-slate-900 border border-slate-700 flex flex-col justify-between">
                  <div className="font-bold text-cyan-400">5. THRESHOLD ENGINE</div>
                  <div className="my-1.5 text-slate-300">Configurable Safe Margins Check</div>
                  <div className="text-[9px] text-slate-500">Warn/Crit State Transitions</div>
                </div>

                <div className="p-2.5 rounded bg-slate-900 border border-slate-700 flex flex-col justify-between">
                  <div className="font-bold text-cyan-400">6. SAFETY INTERLOCK</div>
                  <div className="my-1.5 text-slate-300">Human Entry Denied / Alarm Dispatch</div>
                  <div className="text-[9px] text-slate-500">SCADA Klaxon + RTH</div>
                </div>
              </div>

              {/* Status Note on Simulation Mode */}
              <div className="p-3 rounded bg-amber-950/20 border border-amber-500/40 text-[11px] font-sans text-amber-200 flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Software Simulation Demarcation:</span> All live telemetry currently processed by this client is generated by the internal simulation engine with deterministic micro-climates and collision physics. No physical hardware connection is claimed.
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BOM VS SIMULATION */}
          {activeTab === 'BOM' && (
            <div className="space-y-3">
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs border border-slate-800">
                  <thead className="bg-slate-900 text-slate-400 text-[10px] uppercase">
                    <tr>
                      <th className="p-2">Component</th>
                      <th className="p-2">Proposed Physical Sensor Model</th>
                      <th className="p-2">Current Software Simulation Status</th>
                      <th className="p-2">Engineering & Honesty Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    <tr className="hover:bg-slate-800/30">
                      <td className="p-2 font-bold text-white">Microcontroller</td>
                      <td className="p-2 text-cyan-300">ESP32 DevKit V1 (30-pin)</td>
                      <td className="p-2 text-emerald-400">Simulated Telemetry Protocol</td>
                      <td className="p-2 text-slate-400 text-[11px]">240MHz Xtensa dual-core, onboard Wi-Fi / BLE.</td>
                    </tr>
                    <tr className="hover:bg-slate-800/30">
                      <td className="p-2 font-bold text-white">Oxygen Channel</td>
                      <td className="p-2 text-cyan-300">DFRobot SEN0322 Electrochemical</td>
                      <td className="p-2 text-emerald-400">Simulated (% vol)</td>
                      <td className="p-2 text-slate-400 text-[11px]">Calibrated I2C galvanic cell sensor for O2 atmospheric levels.</td>
                    </tr>
                    <tr className="hover:bg-slate-800/30">
                      <td className="p-2 font-bold text-white">Temp & Humidity</td>
                      <td className="p-2 text-cyan-300">DFRobot SEN0334 (Sensirion SHT31-F)</td>
                      <td className="p-2 text-emerald-400">Simulated (°C & % RH)</td>
                      <td className="p-2 text-slate-400 text-[11px]">Industrial ±2% RH, ±0.2°C accuracy with PTFE dust filter.</td>
                    </tr>
                    <tr className="hover:bg-slate-800/30">
                      <td className="p-2 font-bold text-white">Toxic Gases (H2S, CO)</td>
                      <td className="p-2 text-cyan-300">MQ-135 Prototype (Limited)</td>
                      <td className="p-2 text-amber-400">Hypothetical Independent Channels</td>
                      <td className="p-2 text-amber-200/90 text-[11px]">
                        <strong>CRITICAL HONESTY:</strong> Low-cost MQ-135 is a broad air-quality sensor; it CANNOT accurately distinguish H2S from CO. Our simulation models two separate hypothetical channels to represent future dedicated electrochemical sensors (e.g. ME4-H2S).
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-800/30">
                      <td className="p-2 font-bold text-white">Water Detection</td>
                      <td className="p-2 text-cyan-300">FC-37 / YL-83 Conductive Probe</td>
                      <td className="p-2 text-emerald-400">Simulated (Binary)</td>
                      <td className="p-2 text-slate-400 text-[11px]">Gold-plated tracks detect puddle grounding beneath rover chassis.</td>
                    </tr>
                    <tr className="hover:bg-slate-800/30">
                      <td className="p-2 font-bold text-white">Proximity / Obstacle</td>
                      <td className="p-2 text-cyan-300">HC-SR04 Ultrasonic Ranging</td>
                      <td className="p-2 text-emerald-400">Simulated (Raycast Geometry)</td>
                      <td className="p-2 text-slate-400 text-[11px]">40kHz ultrasonic time-of-flight calculated against virtual sewer walls.</td>
                    </tr>
                    <tr className="hover:bg-slate-800/30">
                      <td className="p-2 font-bold text-white">Drivetrain & Motors</td>
                      <td className="p-2 text-cyan-300">L298N Dual H-Bridge + 4x Geared TT</td>
                      <td className="p-2 text-emerald-400">Simulated Kinematics</td>
                      <td className="p-2 text-slate-400 text-[11px]">Skid-steer 4WD with differential PWM throttle control.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: ESP32 MQTT PROTOCOL */}
          {activeTab === 'MQTT' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-cyan-300 text-xs">JSON TELEMETRY PAYLOAD SPECIFICATION</h4>
                  <p className="text-[10px] text-slate-400 font-sans">
                    ESP32 publishes to topic: <code className="text-cyan-400">hazardscout/telemetry</code>
                  </p>
                </div>
                <button
                  onClick={handleCopyCode}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[10px] flex items-center space-x-1 border border-slate-700 transition"
                >
                  {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'COPIED C++ CODE' : 'COPY FIRMWARE SNIPPET'}</span>
                </button>
              </div>

              {/* JSON Payload preview */}
              <div className="p-3 rounded bg-black/60 border border-slate-800">
                <span className="text-[10px] text-slate-500 block mb-1">Standard MQTT Ingestion Payload:</span>
                <pre className="text-[11px] text-cyan-300 overflow-x-auto leading-relaxed">
                  {sampleJsonSchema}
                </pre>
              </div>

              {/* ESP32 Arduino snippet */}
              <div className="p-3 rounded bg-black/60 border border-slate-800 max-h-[180px] overflow-y-auto">
                <span className="text-[10px] text-slate-500 block mb-1">ESP32 FreeRTOS Publisher Implementation:</span>
                <pre className="text-[10px] text-emerald-400 overflow-x-auto leading-relaxed">
                  {sampleEsp32Code}
                </pre>
              </div>

              <div className="text-[10px] text-slate-400 font-sans border-t border-slate-800 pt-2">
                <strong>Zero Secret Hardcoding:</strong> In production deployments, MQTT broker credentials and Wi-Fi secrets are injected through encrypted NVS (Non-Volatile Storage) on the ESP32 or through compile-time environment variables.
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-[#0e1626] border-t border-hazard-border flex items-center justify-between text-xs">
          <span className="text-[10px] text-slate-400">
            HazardScout Prototype v1.2 — College Engineering Hackathon Edition
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition text-xs"
          >
            DISMISS
          </button>
        </div>
      </div>
    </div>
  );
};
