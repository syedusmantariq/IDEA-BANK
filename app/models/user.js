// app/models/user.js
// load the things we need
var mongoose = require('mongoose');
var bcrypt   = require('bcrypt-nodejs');

// define the schema for our user model
var userSchema = mongoose.Schema({

    local           : {
        email       : {type: String, unique: true},
        password    : String,
        firstName   : String,
        lastName    : String,
        prof: String,
        accountConfirmToken: String,
        isModified  : {type: Boolean, default: false},
//        accountConfirmExpires: Date,
        isVerified  : {type: Boolean, default: false}

    },

    personal: {
        email        : {type: String, unique: true},
        gender       : String,
        bday         : String,
        bmonth       : String,
        byear        : String,
        country      : String,
        state        : String,
        address      : String,
        NIC          : String,
        landlineNo   : String,
        mobileNo     : String,
        skills   : {type: String, default: 'empty'},
    }
});

// methods ======================
// generating a hash
userSchema.methods.generateHash = function(password) {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};

// checking if password is valid
userSchema.methods.validPassword = function(password) {
    return bcrypt.compareSync(password, this.local.password);
};

// create the model for users and expose it to our app
module.exports = mongoose.model('User', userSchema);


