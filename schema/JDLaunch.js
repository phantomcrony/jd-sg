const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let RegionSchema = new Schema({
    
    product_name: {
        type: String,
        required: true,
        
    },
    link: {
        type: String,
        required: true,
        unique:true
        
    },
    picture: {
        type: String,
        required: true,
        
    },

},{strict:false });
module.exports = mongoose.model('jdlaunches', RegionSchema);