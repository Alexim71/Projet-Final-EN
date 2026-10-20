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
