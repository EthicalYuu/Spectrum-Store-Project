const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    product: {
        type: String,
        required: true,
        index: true
    },
    price: {
        type: Number,
        required: true,
        default: 0.00
    },
    co: {
        type: String,
        required: false
    },
    qty: {
        type: Number,
        required: false,
        default: 0
    },
    desc: {
        type: String,
        required: false,
        default: 'Nothing to show',
        index: true
    },
    cat: {
        type: String
    },
    country: {
        type: String,
        required: false,
        default: "Unknown"
    },
    isDiscount: {
        type: Boolean,
        required: false,
        default: false
    },
    discount: {
        type: Number,
        required: false,
        default: 0.0
    },
    image: {
        type: Buffer,
    },
    seen: {
        type: Number,
        required: false,
        default: 0
    }
})

const Product = mongoose.model('Product', productSchema);

module.exports = Product;