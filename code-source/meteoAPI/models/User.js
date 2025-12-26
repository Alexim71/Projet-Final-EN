const mongoose = require('mongoose');



const authoritySchema = new mongoose.Schema({
  _id: {
    type: String,  
    required: true
  }
}, { _id: false }); // Empêche Mongoose d’ajouter un second _id automatique

const userSchema = new mongoose.Schema({
  // _id: {
  //   type: String, 
  //   required: true
  // },
  login: {
    type: String,
    // required: true,
    unique: true
  },
  password: {
    type: String,
    // required: true
  },
  first_name: {
    type: String,
    default: ''
  },
  last_name: {
    type: String,
    default: ''
  },
  email: {
    type: String,
    required: true,
    lowercase: true
  },
  tokenConfirmation: { 
    type: String 
  },
  activated: {
    type: Boolean,
    default: false
  },
  lang_key: {
    type: String,
    default: 'fr'
  },
  authorities: {
    type: [authoritySchema], // 👈 tableau d’objets avec un champ _id
    default: []
  },
  created_by: {
    type: String,
    default: 'system'
  },
  created_date: {
    type: Date,
    default: Date.now
  },
  last_modified_by: {
    type: String,
    default: 'system'
  },
  last_modified_date: {
    type: Date,
    default: Date.now
  },
  _class: {
    type: String,
    default: 'com.urgeo.recicamet.domain.User'
  }
}, {
  collection: 'user', // 👉 nom exact de la collection existante
  versionKey: false
});

module.exports = mongoose.model('User', userSchema,'jhi_user');


