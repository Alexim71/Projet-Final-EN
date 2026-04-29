const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

module.exports = async function sendConfirmationEmail(to, code) {
  await transporter.sendMail({
    from: `"URGmetEO" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Votre code de confirmation URGmetEO',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #27B6F4;">URGmetEO</h2>
        <p>Bonjour,</p>
        <p>Voici votre code de confirmation pour activer votre compte :</p>
        <div style="background: #f0f8ff; border: 2px solid #27B6F4; border-radius: 12px;
                    padding: 20px; text-align: center; margin: 20px 0;">
          <span style="font-size: 36px; font-weight: bold; color: #27B6F4; letter-spacing: 8px;">
            ${code}
          </span>
        </div>
        <p>Entrez ce code dans l'application URGmetEO pour créer votre mot de passe.</p>
        <p style="color:#888; font-size:12px;">Si vous n'avez pas créé de compte, ignorez cet email.</p>
      </div>
    `,
  });
};
