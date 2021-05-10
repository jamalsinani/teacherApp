const nodemailer = require('nodemailer');
const mailGun = require('nodemailer-mailgun-transport');

const auth = {
    auth: {
        api_key: '98d551c39adf934cd31477ccf9dfeb0f-602cc1bf-84aa5b98',
        domain: 'sandboxdd030172d76d4c809cfa3e93a2211c05.mailgun.org'
    }
};

const transporter = nodemailer.createTransport(mailGun(auth));

const sendMail = (email, subject, text, cb) => {
    const mailOptions = {
        from: email,
        to: 'jasinani@gmail.com',
        subject,
        text
    };
    
    transporter.sendMail(mailOptions, (err, data) => {
        if (err) {
            cb(err, null)
        } else {
           cb(null, data)
        }
    })
};

module.exports = sendMail;
