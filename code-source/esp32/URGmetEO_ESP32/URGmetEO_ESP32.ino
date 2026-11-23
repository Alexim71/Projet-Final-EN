#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <time.h>

#define APP_DEMO_MODE 1

#if !APP_DEMO_MODE
#include <Adafruit_BME280.h>
#include <Wire.h>
#endif

const char *WIFI_SSID = "YOUR_WIFI_NAME";
const char *WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char *DEVICE_TOKEN = "PASTE_THE_SAME_RANDOM_TOKEN_AS_RENDER";
const char *API_ROOT = "https://projet-final-en.onrender.com";

constexpr uint8_t LED_GREEN_PIN = 25;
constexpr uint8_t LED_YELLOW_PIN = 26;
constexpr uint8_t LED_RED_PIN = 27;

constexpr unsigned long DEMO_POLL_INTERVAL_MS = 3000;
constexpr unsigned long SENSOR_POST_INTERVAL_MS = 15000;
constexpr unsigned long WIFI_RETRY_INTERVAL_MS = 10000;

const char ROOT_CA[] PROGMEM = R"PEM(
-----BEGIN CERTIFICATE-----
MIIFazCCA1OgAwIBAgIRAIIQz7DSQONZRGPgu2OCiwAwDQYJKoZIhvcNAQELBQAw
TzELMAkGA1UEBhMCVVMxKTAnBgNVBAoTIEludGVybmV0IFNlY3VyaXR5IFJlc2Vh
cmNoIEdyb3VwMRUwEwYDVQQDEwxJU1JHIFJvb3QgWDEwHhcNMTUwNjA0MTEwNDM4
WhcNMzUwNjA0MTEwNDM4WjBPMQswCQYDVQQGEwJVUzEpMCcGA1UEChMgSW50ZXJu
ZXQgU2VjdXJpdHkgUmVzZWFyY2ggR3JvdXAxFTATBgNVBAMTDElTUkcgUm9vdCBY
MTCCAiIwDQYJKoZIhvcNAQEBBQADggIPADCCAgoCggIBAK3oJHP0FDfzm54rVygc
h77ct984kIxuPOZXoHj3dcKi/vVqbvYATyjb3miGbESTtrFj/RQSa78f0uoxmyF+
0TM8ukj13Xnfs7j/EvEhmkvBioZxaUpmZmyPfjxwv60pIgbz5MDmgK7iS4+3mX6U
A5/TR5d8mUgjU+g4rk8Kb4Mu0UlXjIB0ttov0DiNewNwIRt18jA8+o+u3dpjq+sW
T8KOEUt+zwvo/7V3LvSye0rgTBIlDHCNAymg4VMk7BPZ7hm/ELNKjD+Jo2FR3qyH
B5T0Y3HsLuJvW5iB4YlcNHlsdu87kGJ55tukmi8mxdAQ4Q7e2RCOFvu396j3x+UC
B5iPNgiV5+I3lg02dZ77DnKxHZu8A/lJBdiB3QW0KtZB6awBdpUKD9jf1b0SHzUv
KBds0pjBqAlkd25HN7rOrFleaJ1/ctaJxQZBKT5ZPt0m9STJEadao0xAH0ahmbWn
OlFuhjuefXKnEgV4We0+UXgVCwOPjdAvBbI+e0ocS3MFEvzG6uBQE3xDk3SzynTn
jh8BCNAw1FtxNrQHusEwMFxIt4I7mKZ9YIqioymCzLq9gwQbooMDQaHWBfEbwrbw
qHyGO0aoSCqI3Haadr8faqU9GY/rOPNk3sgrDQoo//fb4hVC1CLQJ13hef4Y53CI
rU7m2Ys6xt0nUW7/vGT1M0NPAgMBAAGjQjBAMA4GA1UdDwEB/wQEAwIBBjAPBgNV
HRMBAf8EBTADAQH/MB0GA1UdDgQWBBR5tFnme7bl5AFzgAiIyBpY9umbbjANBgkq
hkiG9w0BAQsFAAOCAgEAVR9YqbyyqFDQDLHYGmkgJykIrGF1XIpu+ILlaS/V9lZL
ubhzEFnTIZd+50xx+7LSYK05qAvqFyFWhfFQDlnrzuBZ6brJFe+GnY+EgPbk6ZGQ
3BebYhtF8GaV0nxvwuo77x/Py9auJ/GpsMiu/X1+mvoiBOv/2X/qkSsisRcOj/KK
NFtY2PwByVS5uCbMiogziUwthDyC3+6WVwW6LLv3xLfHTjuCvjHIInNzktHCgKQ5
ORAzI4JMPJ+GslWYHb4phowim57iaztXOoJwTdwJx4nLCgdNbOhdjsnvzqvHu7Ur
TkXWStAmzOVyyghqpZXjFaH3pO3JLF+l+/+sKAIuvtd7u+Nxe5AW0wdeRlN8NwdC
jNPElpzVmbUq4JUagEiuTDkHzsxHpFKVK7q4+63SM1N95R1NbdWhscdCb+ZAJzVc
oyi3B43njTOQ5yOf+1CceWxG1bQVs5ZufpsMljq4Ui0/1lvh+wjChP4kqKOJ2qxq
4RgqsahDYVvTH9w7jXbyLeiNdd8XM2w9U/t7y0Ff/9yi0GE44Za4rF2LN9d11TPA
mRGunUHBcnWEvgJBQl9nJEiU0Zsnvgc/ubhPgXRR4Xq37Z0j4r7g1SgEEzwxA57d
emyPxgcYxn/eR44/KJ4EBs+lVDR3veyJm+kXQ99b21/+jh5Xos1AnX5iItreGCc=
-----END CERTIFICATE-----
)PEM";

unsigned long lastActionAt = 0;
unsigned long lastWifiAttemptAt = 0;
bool clockSynchronized = false;

#if !APP_DEMO_MODE
constexpr uint8_t I2C_SDA_PIN = 21;
constexpr uint8_t I2C_SCL_PIN = 22;
Adafruit_BME280 bme;
bool bmeAvailable = false;
#endif

void setAllLeds(bool green, bool yellow, bool red) {
  digitalWrite(LED_GREEN_PIN, green ? HIGH : LOW);
  digitalWrite(LED_YELLOW_PIN, yellow ? HIGH : LOW);
  digitalWrite(LED_RED_PIN, red ? HIGH : LOW);
}

void setWeatherLevel(const char *level) {
  if (strcmp(level, "normal") == 0) {
    setAllLeds(true, false, false);
  } else if (strcmp(level, "warning") == 0) {
    setAllLeds(false, true, false);
  } else if (strcmp(level, "critical") == 0) {
    setAllLeds(false, false, true);
  } else {
    setAllLeds(false, false, false);
    Serial.println("Etat inconnu: voyants eteints.");
  }
}

bool connectToWifi() {
  if (WiFi.status() == WL_CONNECTED) return true;
  if (millis() - lastWifiAttemptAt < WIFI_RETRY_INTERVAL_MS) return false;

  lastWifiAttemptAt = millis();
  Serial.printf("Connexion Wi-Fi: %s\n", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long startedAt = millis();
  while (WiFi.status() != WL_CONNECTED &&
         millis() - startedAt < 15000) {
    delay(250);
    Serial.print(".");
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("Wi-Fi connecte, IP: ");
    Serial.println(WiFi.localIP());
    return true;
  }

  setAllLeds(false, false, false);
  Serial.println("Wi-Fi indisponible; voyants eteints jusqu'au prochain essai.");
  return false;
}

bool synchronizeClock() {
  if (clockSynchronized && time(nullptr) > 1760000000) return true;

  configTime(0, 0, "pool.ntp.org", "time.nist.gov");
  const unsigned long startedAt = millis();
  while (time(nullptr) <= 1760000000 &&
         millis() - startedAt < 10000) {
    delay(250);
  }
  clockSynchronized = time(nullptr) > 1760000000;
  if (!clockSynchronized) {
    Serial.println("Heure non synchronisee; connexion HTTPS suspendue.");
    setAllLeds(false, false, false);
  }
  return clockSynchronized;
}

bool readLevelResponse(HTTPClient &http) {
  const int statusCode = http.GET();
  if (statusCode != HTTP_CODE_OK) {
    Serial.printf("GET echoue, HTTP %d\n", statusCode);
    setAllLeds(false, false, false);
    return false;
  }

  DynamicJsonDocument response(512);
  const DeserializationError error = deserializeJson(response, http.getString());
  if (error) {
    Serial.printf("Reponse JSON invalide: %s\n", error.c_str());
    setAllLeds(false, false, false);
    return false;
  }

  const char *level = response["level"] | "";
  const char *led = response["led"] | "";
  Serial.printf("Scenario: %s, voyant: %s\n", level, led);
  setWeatherLevel(level);
  return true;
}

void pollAppDemoState() {
  WiFiClientSecure client;
  client.setCACert(ROOT_CA);

  HTTPClient http;
  const String url = String(API_ROOT) + "/api/iot/demo-state";
  if (!http.begin(client, url)) {
    Serial.println("Impossible d'ouvrir la connexion HTTPS.");
    setAllLeds(false, false, false);
    return;
  }
  http.addHeader("X-Device-Token", DEVICE_TOKEN);
  readLevelResponse(http);
  http.end();
}

#if !APP_DEMO_MODE
void sendBme280Measurement() {
  if (!bmeAvailable) {
    setAllLeds(false, false, false);
    Serial.println("Capteur BME280 indisponible.");
    return;
  }

  WiFiClientSecure client;
  client.setCACert(ROOT_CA);

  HTTPClient http;
  const String url = String(API_ROOT) + "/api/iot/measurements";
  if (!http.begin(client, url)) {
    Serial.println("Impossible d'ouvrir la connexion HTTPS.");
    setAllLeds(false, false, false);
    return;
  }
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Token", DEVICE_TOKEN);

  DynamicJsonDocument measurement(512);
  measurement["temperature"] = bme.readTemperature();
  measurement["humidity"] = bme.readHumidity();
  measurement["pressure"] = bme.readPressure() / 100.0F;
  measurement["device_status"] = "ONLINE";
  measurement["firmware_version"] = "1.0.0";

  String requestBody;
  serializeJson(measurement, requestBody);
  const int statusCode = http.POST(requestBody);
  if (statusCode != HTTP_CODE_CREATED) {
    Serial.printf("POST mesure echoue, HTTP %d\n", statusCode);
    setAllLeds(false, false, false);
    http.end();
    return;
  }

  DynamicJsonDocument response(512);
  const DeserializationError error = deserializeJson(response, http.getString());
  if (error) {
    Serial.printf("Reponse JSON invalide: %s\n", error.c_str());
    setAllLeds(false, false, false);
  } else {
    const char *level = response["level"] | "";
    const char *led = response["led"] | "";
    Serial.printf("Mesure envoyee; niveau: %s, voyant: %s\n", level, led);
    setWeatherLevel(level);
  }
  http.end();
}
#endif

void setup() {
  Serial.begin(115200);
  pinMode(LED_GREEN_PIN, OUTPUT);
  pinMode(LED_YELLOW_PIN, OUTPUT);
  pinMode(LED_RED_PIN, OUTPUT);
  setAllLeds(false, false, false);

#if !APP_DEMO_MODE
  Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);
  bmeAvailable = bme.begin(0x76) || bme.begin(0x77);
  Serial.println(bmeAvailable ? "BME280 pret." : "BME280 non detecte.");
#endif

  connectToWifi();
}

void loop() {
  if (!connectToWifi()) {
    delay(250);
    return;
  }
  if (!synchronizeClock()) {
    delay(250);
    return;
  }

#if APP_DEMO_MODE
  if (millis() - lastActionAt >= DEMO_POLL_INTERVAL_MS) {
    lastActionAt = millis();
    pollAppDemoState();
  }
#else
  if (millis() - lastActionAt >= SENSOR_POST_INTERVAL_MS) {
    lastActionAt = millis();
    sendBme280Measurement();
  }
#endif

  delay(50);
}
