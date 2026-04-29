const User = require('../models/User');
const crypto = require('crypto');
const sendConfirmationEmail = require('../utils/mailer');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'urgmeteo_secret_change_in_prod';
const JWT_EXPIRES = '7d';

exports.register = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email requis." });

    const userExist = await User.findOne({ email });

    // Bloquer uniquement si le compte est déjà activé (mot de passe défini)
    if (userExist && userExist.activated) {
      return res.status(400).json({ message: "Email déjà utilisé." });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();

    if (userExist && !userExist.activated) {
      // Compte existant mais non activé : renvoyer un nouveau code
      userExist.tokenConfirmation = code;
      await userExist.save();
      await sendConfirmationEmail(email, code);
    } else {
      // Nouveau compte
      const authorities = [{ _id: 'ROLE_USER' }];
      const newUser = new User({ email, tokenConfirmation: code, authorities });
      await newUser.save();
      await sendConfirmationEmail(email, code);
    }

    res.status(201).json({ message: "Code envoyé. Vérifiez votre email." });
  } catch (err) {
    console.error('[register]', err);
    res.status(500).json({ message: "Erreur serveur." });
  }
};

exports.confirmCode = async (req, res) => {
  try {
    const { email, code, motDePasse } = req.body;

    if (!email || !code || !motDePasse)
      return res.status(400).json({ message: "Email, code et mot de passe requis." });

    if (motDePasse.length < 6)
      return res.status(400).json({ message: "Le mot de passe doit contenir au moins 6 caractères." });

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(404).json({ message: "Utilisateur non trouvé." });
    if (user.activated) return res.status(400).json({ message: "Compte déjà activé." });
    if (user.tokenConfirmation !== code.trim())
      return res.status(400).json({ message: "Code incorrect." });

    user.password = await bcrypt.hash(motDePasse, 10);
    user.activated = true;
    user.tokenConfirmation = null;
    await user.save();

    res.json({ message: "Compte confirmé ! Vous pouvez vous connecter." });
  } catch (err) {
    console.error('[confirmCode]', err);
    res.status(500).json({ message: "Erreur serveur." });
  }
};



exports.getConfirmationPage = async (req, res) => {
  try {
    const { token } = req.params;
    const user = await User.findOne({ tokenConfirmation: token });

    if (!user) {
      return res.status(400).send(`
        <!DOCTYPE html><html><head><meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>URGmetEO</title>
        <style>body{font-family:Arial,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#f0f8ff;}
        .box{background:#fff;border-radius:16px;padding:40px;max-width:420px;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,.1);}
        h2{color:#e53e3e;}p{color:#555;}</style></head>
        <body><div class="box"><h2>❌ Lien invalide</h2><p>Ce lien de confirmation est invalide ou a déjà été utilisé.</p></div></body></html>
      `);
    }

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>URGmetEO — Confirmer le compte</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: Arial, sans-serif; background: #4facfe; min-height: 100vh;
                 display: flex; justify-content: center; align-items: center; padding: 20px; }
          .card { background: #fff; border-radius: 20px; padding: 36px 32px;
                  max-width: 420px; width: 100%; box-shadow: 0 8px 32px rgba(0,0,0,.15); }
          h1 { color: #27B6F4; font-size: 28px; margin-bottom: 6px; }
          h2 { color: #1a1a2e; font-size: 20px; margin-bottom: 20px; }
          label { display: block; font-size: 13px; font-weight: 600; color: #444; margin-bottom: 6px; }
          input { width: 100%; padding: 13px 16px; border: 1.5px solid #e0e0e0; border-radius: 10px;
                  font-size: 15px; margin-bottom: 16px; outline: none; }
          input:focus { border-color: #27B6F4; }
          button { width: 100%; background: #27B6F4; color: #fff; border: none;
                   padding: 14px; border-radius: 12px; font-size: 16px; font-weight: 700;
                   cursor: pointer; margin-top: 4px; }
          button:hover { background: #1da8e8; }
          button:disabled { opacity: .6; cursor: not-allowed; }
          #msg { margin-top: 14px; padding: 12px; border-radius: 8px; font-size: 14px;
                 text-align: center; display: none; }
          .error { background: #fff0f0; color: #e53e3e; display: block !important; }
          .success { background: #f0fff4; color: #276749; display: block !important; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>URGmetEO</h1>
          <h2>Créer votre mot de passe</h2>
          <label>Mot de passe</label>
          <input type="password" id="p1" placeholder="Minimum 6 caractères" />
          <label>Confirmer le mot de passe</label>
          <input type="password" id="p2" placeholder="Répéter le mot de passe" />
          <button id="btn" onclick="submitPassword()">Confirmer mon compte</button>
          <div id="msg"></div>
        </div>
        <script>
          async function submitPassword() {
            const p1 = document.getElementById('p1').value;
            const p2 = document.getElementById('p2').value;
            const msg = document.getElementById('msg');
            const btn = document.getElementById('btn');
            msg.className = ''; msg.style.display = 'none';

            if (p1.length < 6) { msg.textContent = 'Le mot de passe doit contenir au moins 6 caractères.'; msg.className = 'error'; return; }
            if (p1 !== p2)     { msg.textContent = 'Les mots de passe ne correspondent pas.'; msg.className = 'error'; return; }

            btn.disabled = true; btn.textContent = 'Confirmation…';
            try {
              const res = await fetch(window.location.href, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ motDePasse1: p1, motDePasse2: p2 })
              });
              const data = await res.json();
              if (res.ok) {
                msg.textContent = '✅ ' + data.message + ' Revenez sur l\'application pour vous connecter.';
                msg.className = 'success';
                document.querySelector('.card').querySelector('input,button') &&
                  ['p1','p2','btn'].forEach(id => { const el = document.getElementById(id); if(el) el.style.display='none'; });
              } else {
                msg.textContent = data.message || 'Erreur lors de la confirmation.';
                msg.className = 'error';
                btn.disabled = false; btn.textContent = 'Confirmer mon compte';
              }
            } catch(e) {
              msg.textContent = 'Erreur réseau. Réessayez.';
              msg.className = 'error';
              btn.disabled = false; btn.textContent = 'Confirmer mon compte';
            }
          }
        </script>
      </body>
      </html>
    `);
  } catch (err) {
    console.error('[getConfirmationPage]', err);
    res.status(500).send('<h2>Erreur serveur.</h2>');
  }
};

exports.confirmAccount = async (req, res) => {
  try {
    const { token } = req.params;
    const { motDePasse1, motDePasse2 } = req.body;

    if (!motDePasse1 || motDePasse1.length < 6)
      return res.status(400).json({ message: "Le mot de passe doit contenir au moins 6 caractères." });

    if (motDePasse1 !== motDePasse2)
      return res.status(400).json({ message: "Les mots de passe ne correspondent pas." });

    const user = await User.findOne({ tokenConfirmation: token });
    if (!user) return res.status(400).json({ message: "Token invalide." });

    user.password = await bcrypt.hash(motDePasse1, 10);
    user.activated = true;
    user.tokenConfirmation = null;
    await user.save();

    res.json({ message: "Compte confirmé ! Tu peux maintenant te connecter." });
  } catch (err) {
    console.error('[confirmAccount]', err);
    res.status(500).json({ message: "Erreur serveur." });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, motDePasse } = req.body;
    if (!email || !motDePasse)
      return res.status(400).json({ message: "Email et mot de passe requis." });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "Utilisateur non trouvé." });
    if (!user.activated) return res.status(403).json({ message: "Compte non confirmé." });

    const match = await bcrypt.compare(motDePasse, user.password);
    if (!match) return res.status(401).json({ message: "Mot de passe incorrect." });

    const token = jwt.sign(
      { id: user._id, email: user.email, roles: user.authorities.map(a => a._id) },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );

    res.json({
      message: "Connexion réussie !",
      token,
      user: { id: user._id, email: user.email }
    });
  } catch (err) {
    console.error('[login]', err);
    res.status(500).json({ message: "Erreur serveur." });
  }
};

