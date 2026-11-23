const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { normalizeWeatherPayload } = require('../utils/normalizeData');

test('normalise les anciennes unités météo avant stockage', () => {
  const result = normalizeWeatherPayload({
    temperature: 300,
    windSpeed: 10,
    pressure: 101325,
    rainfall: 1.236
  });

  assert.equal(result.temperature, 26.85);
  assert.equal(result.windSpeed, 36);
  assert.equal(result.pressure, 1013.25);
  assert.equal(result.rainfall, 1.24);
});

test('le modèle de mesure requiert le lien station et sa date canonique', () => {
  const Data = require('../models/Data');
  const requiredPaths = ['station', 'measured_at'];

  for (const path of requiredPaths) {
    assert.equal(Data.schema.path(path).options.required, true);
  }
  assert.ok(Data.schema.indexes().some(([keys]) =>
    keys.station === 1 && keys.measured_at === -1
  ));
  assert.equal(mongoose.connection.readyState, 0);
});

test('le middleware limite les tentatives répétées', () => {
  const rateLimit = require('../middleware/rateLimit');
  const middleware = rateLimit({ windowMs: 60_000, max: 1 });
  const req = { ip: `test-${Date.now()}`, baseUrl: '/test', method: 'POST' };
  const createResponse = () => ({
    headers: {},
    statusCode: 200,
    set(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  });

  let nextCalls = 0;
  const firstResponse = createResponse();
  middleware(req, firstResponse, () => { nextCalls += 1; });
  const secondResponse = createResponse();
  middleware(req, secondResponse, () => { nextCalls += 1; });

  assert.equal(nextCalls, 1);
  assert.equal(secondResponse.statusCode, 429);
  assert.ok(secondResponse.headers['Retry-After']);
});

test('classe les mesures selon le niveau de voyant IoT attendu', () => {
  const { classifyWeather } = require('../services/weatherSeverity');

  assert.deepEqual(classifyWeather({ temperature: 30, humidity: 65 }), {
    level: 'normal',
    led: 'green'
  });
  assert.deepEqual(classifyWeather({ wind_speed: 14 }), {
    level: 'warning',
    led: 'yellow'
  });
  assert.deepEqual(classifyWeather({ pressure: 989 }), {
    level: 'critical',
    led: 'red'
  });
  assert.deepEqual(classifyWeather({ temperature: 40, humidity: 65 }), {
    level: 'critical',
    led: 'red'
  });
});

test('le point d’entrée IoT exige son jeton d’appareil dédié', () => {
  const requireDeviceToken = require('../middleware/requireDeviceToken');
  const previousToken = process.env.IOT_DEVICE_TOKEN;
  process.env.IOT_DEVICE_TOKEN = 'test-device-token';
  const createResponse = () => ({
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  });

  try {
    let nextCalls = 0;
    const denied = createResponse();
    requireDeviceToken({ get: () => 'wrong-token' }, denied, () => { nextCalls += 1; });
    assert.equal(denied.statusCode, 401);

    const accepted = createResponse();
    requireDeviceToken(
      { get: () => 'test-device-token' },
      accepted,
      () => { nextCalls += 1; }
    );
    assert.equal(accepted.statusCode, 200);
    assert.equal(nextCalls, 1);
  } finally {
    if (previousToken === undefined) delete process.env.IOT_DEVICE_TOKEN;
    else process.env.IOT_DEVICE_TOKEN = previousToken;
  }
});
