const mongoose = require('mongoose');

const classSchmea = new mongoose.Schema({
    name:{
        type:String
    },
    subject:{
        type:String
    },
    userId:{
        type:String
    },
    students:{
        type:Array
    }
})

module.exports = mongoose.model('UserClass',classSchmea);