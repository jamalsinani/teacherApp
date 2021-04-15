const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username:{
        type:String
    },
    email:{
        type:String
    },
    password:{
        type:String
    },
    image: {
        type: String,
        default: 'img_81837.png'
    },
    school:{
        type:String
    },
    year:{
        type:String
    },
    class:{
        type:String
    },
    name:{
        type:String
    }
})

module.exports = mongoose.model('User',userSchema);