const mongoose = require('mongoose');


const columnSchema = new mongoose.Schema({
    name:{
        type:String
    },
    short:{
        type:String
    },
    desc:{
        type:String
    },
    type:{
        type:String
    },
    value:{
        type:String
    },
    inputColumns:{
        type:Array
    },
    classId:{
        type:String
    }
})

module.exports = mongoose.model('Column',columnSchema);