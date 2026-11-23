# URGmetEO - ESP32

This sketch supports two modes:

- `APP_DEMO_MODE 1`: polls the scenario selected in the mobile app and controls
  the three LEDs. Sign in to the app, enable demo mode, and select one of the
  three demo stations.
- `APP_DEMO_MODE 0`: reads temperature, humidity, and pressure from a BME280,
  posts the measurements to the API, and applies the returned alert state.

The sensor mode currently supports a BME280 only. Rain, wind, and other sensors
require their exact models and calibration before they can be added safely.

## Wiring

For a classic ESP32 DevKit:

| Component | ESP32 pin |
|---|---:|
| Green LED anode through a suitable series resistor | GPIO 25 |
| Yellow LED anode through a suitable series resistor | GPIO 26 |
| Red LED anode through a suitable series resistor | GPIO 27 |
| Each LED cathode | GND |
| BME280 SDA | GPIO 21 |
| BME280 SCL | GPIO 22 |
| BME280 VCC / GND | Use the voltage supported by the exact module / GND |

The LED wiring assumes three common LEDs with their cathodes connected to
ground. Never connect an LED directly to a GPIO pin; use a series resistor.
Check the BME280 module pin labels and voltage requirements before powering it.
Different ESP32 variants may use different safe GPIO pins.

## API configuration

Set these variables in the Render API service:

- `IOT_DEVICE_TOKEN`: a unique random secret for this test device.
- `IOT_STATION_CODE`: a station code that already exists in MongoDB Atlas.

Generate a token locally with Node.js:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Keep the generated value private. Do not commit it, put it in the mobile
application, or include it in screenshots or reports.

The mobile app must use the existing HTTPS API URL. For scenario synchronization,
sign in to the app before changing the demo station. The app sends its selected
scenario using the user's JWT; the ESP32 retrieves only the scenario state using
the separate device token.

## Arduino IDE setup

1. Install the Espressif ESP32 board package and select the board matching the
   module. `ESP32 Dev Module` is a common choice for a classic ESP32 DevKit.
2. Open `URGmetEO_ESP32.ino`.
3. In `WIFI_SSID`, `WIFI_PASSWORD`, and `DEVICE_TOKEN`, enter the local Wi-Fi
   credentials and the same device token configured in Render.
4. Leave `APP_DEMO_MODE` set to `1` for the first LED test.
5. Connect the three LEDs, choose the correct board and serial port, then upload.
6. Open Serial Monitor at 115200 baud. Select normal, warning, or critical demo
   station in the signed-in mobile app; the ESP32 polls the state every three
   seconds.

With Arduino CLI installed, the corresponding Windows commands are:

```powershell
arduino-cli config add board_manager.additional_urls https://espressif.github.io/arduino-esp32/package_esp32_index.json
arduino-cli core update-index
arduino-cli core install esp32:esp32
arduino-cli lib install "ArduinoJson"
arduino-cli compile --fqbn esp32:esp32:esp32 .\code-source\esp32\URGmetEO_ESP32
arduino-cli upload -p COM5 --fqbn esp32:esp32:esp32 .\code-source\esp32\URGmetEO_ESP32
```

Replace `COM5` with the port shown for the connected board. The sketch
synchronizes its clock with NTP before making HTTPS requests so that TLS
certificate date validation works.

The sketch validates HTTPS using the ISRG Root X1 certificate. If the TLS
handshake fails because the service certificate chain changes, install the
current root CA used by the Render service; do not disable certificate
validation for a deployed device.

## Real BME280 measurements

After confirming the LED demo works:

1. Set `APP_DEMO_MODE` to `0`.
2. Install the Arduino libraries `Adafruit BME280 Library`,
   `Adafruit Unified Sensor`, and `ArduinoJson`.
3. Wire the BME280 to I2C and upload again.
4. Confirm `IOT_STATION_CODE` points to the intended registered station.
5. Check the Render logs and Atlas measurements after a successful upload.

The current sketch sends BME280 temperature in Celsius, humidity in percent,
and pressure in hPa. The backend responds with:

- `normal` / `green`
- `warning` / `yellow`
- `critical` / `red`

If Wi-Fi, HTTPS, or the API request fails, all three LEDs are switched off so a
communications failure is not misrepresented as normal weather.

## API routes

- `POST /api/iot/demo-state`: authenticated mobile user stores the selected
  demonstration scenario.
- `GET /api/iot/demo-state`: ESP32 reads the current scenario using
  `X-Device-Token`.
- `POST /api/iot/measurements`: ESP32 sends BME280 readings using
  `X-Device-Token`; `IOT_STATION_CODE` on the API binds the device to a station.

This first version uses one configured device token and one station code. A
multi-device deployment should use per-device credentials, revocation, and
authorization records instead of sharing one token.
