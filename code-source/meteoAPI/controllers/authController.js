const User = require('../models/User');
const crypto = require('crypto');
const sendConfirmationEmail = require('../utils/mailer');
const bcrypt = require('bcrypt');

exports.register = async (req, res) => {
  const { email } = req.body;
  const userExist = await User.findOne({ email });

  if (userExist) return res.status(400).json({ message: "Email déjà utilisé." });

  const token = crypto.randomBytes(32).toString('hex');

   const authorities = [{ _id: 'ROLE_USER' }];

  const newUser = new User({

    // _id: `user-${Date.now()}`,  // tu peux générer un ID unique
      // login: login || email.split('@')[0],
    email,
    tokenConfirmation: token,
    authorities,
    //  activated: false,
    //   lang_key: 'fr',
  });

  await newUser.save();

  await sendConfirmationEmail(email, token);

  res.status(201).json({ message: "Compte créé. Vérifie ton email pour confirmer." });
};



exports.getConfirmationPage = async (req, res) => {
  const { token } = req.params;
  const user = await User.findOne({ tokenConfirmation: token });

  if (!user) return res.status(400).json({ message: "Lien invalide ou expiré." });

  res.json({ message: "Token valide. Envoie un nouveau mot de passe." });
};

exports.confirmAccount = async (req, res) => {
  const { token } = req.params;
  const { motDePasse1, motDePasse2 } = req.body;

  console.log("token:",token)
  console.log("mot de passe",motDePasse1)

  if (motDePasse1 !== motDePasse2)
    return res.status(400).json({ message: "Les mots de passe ne correspondent pas." });

  const user = await User.findOne({ tokenConfirmation: token });
  if (!user) return res.status(400).json({ message: `Token invalide.${token}` });

  user.password = await bcrypt.hash(motDePasse1, 10);
  user.activated = true;
  user.tokenConfirmation = null;
  await user.save();

  res.json({ message: "Compte confirmé ! Tu peux maintenant te connecter." });
};

exports.login = async (req, res) => {
  const { email, motDePasse } = req.body;
  const user = await User.findOne({ email });

  if (!user) return res.status(404).json({ message: "Utilisateur non trouvé." });
  if (!user.activated) return res.status(403).json({ message: "Compte non confirmé." });

  const match = await bcrypt.compare(motDePasse, user.password);
  if (!match) return res.status(401).json({ message: "Mot de passe incorrect." });

  res.json({ message: "Connexion réussie !" });
};

