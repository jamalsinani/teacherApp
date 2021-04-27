const e = require('express');
const nodemailer = require('nodemailer');
const mailGun = require('nodemailer-mailgun-transport');

const auth = {
    auth: {
        api_key: 'eee9b542e92ba38f6d90ef11e7331ce1-71b35d7e-492a7abe',
        domain: 'sandbox41f1fff627ef449991df8bc9a246c207.mailgun.org'
    }
};

const transporter = nodemailer.createTransport(mailGun(auth));

const sendMail = (email, subject, text, cb) => {
    const mailOptions = {
        from: email,
        to: 'jamalsinani@gmail.com',
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
