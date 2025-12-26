const mongoose = require('mongoose');

//const stationSchema = new mongoose.Schema({
 // uuid: { type: String, required: true, unique: true },
 // name: { type: String, required: false },       
//  location: { type: String, required: false },   
//  latitude: { type: Number, required: false },
 // longitude: { type: Number, required: false },
//  isActive: { type: Boolean, default: true }
//}, { timestamps: true });

//module.exports = mongoose.model('Station', stationSchema, 'station');

const StationSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      index: true
    },

    mac_address: {
      type: String,
      index: true
    },

    ip_address: {
      type: String,
      default: ''
    },

    description: {
      type: String
    },

    installation_date: {
      type: Date
    },

    // Coordonnées brutes existantes
    latitude: {
      type: Number,
      required: true
    },

    longitude: {
      type: Number,
      required: true
    },

    altitude: {
      type: Number
    },

    address: {
      type: String
    },

    department: {
      type: String,
      index: true
    },

    province: {
      type: String,
      index: true
    },

    status: {
      type: Number,
      index: true
    },

    details: {
      type: String,
      default: ''
    },

    comments: {
      type: String,
      default: ''
    },

    hash_mac: {
      type: String,
      index: true
    },

    last_down_date: {
      type: Date
    },

    last_data_date: {
      type: Date
    },

    // Références optionnelles
    site: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Site'
    },

    stationHost: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StationHost'
    },

    // 👉 Champ GeoJSON pour la géolocalisation
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        index: '2dsphere'
      }
    },

    // Audit
    created_by: String,
    created_date: Date,
    last_modified_by: String,
    last_modified_date: Date,

    // Compatibilité JHipster / Spring
    _class: {
      type: String,
      default: 'ht.edu.fds.recicamet.domain.Station'
    }
  },
  {
    collection: 'stations', // ⚠️ correspond exactement à ta base
    timestamps: false
  }
);

module.exports = mongoose.model('Station', StationSchema);

