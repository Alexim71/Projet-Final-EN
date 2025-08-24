const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
   host: "smtp.gmail.com",   // Ou smtp.mail.yahoo.com, smtp.office365.com, etc.
  port: 587,
  secure: false, // true pour 465, false pour 587
  auth: {
    user: "sanloveedena@gmail.com",
    pass: "jdje gofg giup arik"
  }
});

module.exports = async function sendConfirmationEmail(to, token) {
  const url = `http://localhost:3000/api/auth/confirm/${token}`;

  await transporter.sendMail({
    from: `"Mon App Météo" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Confirme ton compte',
    html: `<p>Clique ici pour confirmer ton compte :</p><a href="${url}">${url}</a>`
  });
};
