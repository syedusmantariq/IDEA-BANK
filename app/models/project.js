/**
 * Created by IL on 12/19/2015.
 */
var mongoose = require('mongoose');

// define the schema for our user model
var projectSchema = mongoose.Schema({
    email   : String,
    name    : {type:String, unique: true},
    type    : String,
    tags    : String,
    description : String
});

// create the model for users and expose it to our app
module.exports = mongoose.model('Project', projectSchema);
