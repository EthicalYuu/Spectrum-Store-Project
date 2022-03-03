const express = require('express');
const app = express();
const path = require('path');
const mongoose = require('mongoose');
const methodOverride = require('method-override');
const multer = require('multer');
const AppError = require('./AppError');

const Product = require('./models/product');
const { findByIdAndDelete } = require('./models/product');

app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.use(express.static(__dirname + '/public'));
app.use(methodOverride('_method'))

app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs')
app.engine('html', require('ejs').renderFile);

const storage = multer.diskStorage({
    // destination for files
    destination: function(request, file, callback) {
        callback(null, 'public/uploads/images')
    },

    // add back the extension
    filename: function(request, file, callback) {
        callback(null, Date.now() + file.originalname);
    },
});

const upload = multer({
    storage: storage,
    limits: {
        fieldSize: 1024 * 1024 * 10
    },
});

mongoose.connect('mongodb://localhost:27017/productDB', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        console.log("Mongo Connected!")
    })
    .catch(err => {
        console.log("Mongo Connection Failed!")
        console.log(err)
    })


app.listen(3000, () => {
    console.log("ON PORT 3000!")
})

function wrapSync(fn) {
    return function(req, res, next) {
        fn(req, res, next).catch(e => {
            let error = "Somthing went wrong";
            res.render('database/noResults', { error })
            next(e)
        })
    }
}

app.get('/home', wrapSync(async(req, res) => {
    const allProducts = await Product.find({})
    const mostViewed = await Product.aggregate(
        [
            { $sort: { seen: -1 } }
        ]
    )
    const randomCards = [];
    for (let card_no = 0; card_no <= 50; card_no++) {
        let randomNumber = Math.floor(Math.random() * (allProducts.length));
        randomCards.push(randomNumber)
    }
    res.render('home.html', { allProducts, randomCards, mostViewed })
}))

app.get('/category/:device/:page', wrapSync(async(req, res) => {
    const device_name = req.params.device;
    const minPrice = req.query.min_Price;
    const maxPrice = req.query.max_Price;
    const page = req.params.page;
    const companies = await Product.distinct("co", { cat: device_name.toUpperCase() })

    const index = companies.indexOf("");
    if (index > -1) {
        companies.splice(index, 1);
    }

    if (minPrice && maxPrice) {
        let productByCat = await Product.find({ cat: device_name.toUpperCase(), price: { $gt: minPrice, $lt: maxPrice } });
        if (productByCat.length === 0) {
            let error = "Sorry we couldn't find any results"
            res.render('database/noResults', { error })
        } else {
            res.render('category/catProduct', { productByCat, device_name, page, companies })
        }

    } else {
        let productByCat = await Product.find({ cat: device_name.toUpperCase() });
        if (productByCat.length === 0) {
            let error = "Sorry we couldn't find any results"
            res.render('database/noResults', { error })
        } else {
            res.render('category/catProduct', { productByCat, device_name, page, companies })
        }
    }




}))

app.get('/category/:device/:company/:page', wrapSync(async(req, res) => {
    const device_name = req.params.device;
    const page = req.params.page;
    const company = req.params.company;
    const productByCat = await Product.find({ cat: device_name.toUpperCase(), co: company })
    const companies = await Product.distinct("co", { cat: device_name.toUpperCase() })
    const index = companies.indexOf("");
    if (index > -1) {
        companies.splice(index, 1);
    }
    res.render('category/catProductCo', { productByCat, device_name, page, companies, company })
}))

app.get('/product/:id', wrapSync(async(req, res) => {
    const { id } = req.params;
    const selectedProduct = await Product.findById(id)
    const updateSeen = await Product.findByIdAndUpdate(id, { seen: selectedProduct.seen + 1 })
    let checkProducts = await Product.find({ "cat": selectedProduct.cat })
    const randomCards = [];
    for (let card_no = 0; card_no <= 50; card_no++) {
        let randomNumber = Math.floor(Math.random() * (checkProducts.length - 1));
        randomCards.push(randomNumber)
    }
    const index = checkProducts.findIndex(x => x.id === id);
    checkProducts.splice(index, 1);
    res.render('product/product', { selectedProduct, checkProducts, randomCards })
}))

app.get('/db/create', (req, res) => {
    res.render('database/create')
})

app.post('/db/create', upload.single('image'), wrapSync(async(req, res) => {
    if (req.body.discount === 0 || !req.body.discount) {
        req.body.isDiscount = false;
    } else {
        req.body.isDiscount = true;
    }

    req.body.cat = req.body.cat.toUpperCase();
    req.body.image = req.file.filename;
    console.log(req.body)
    const newProduct = new Product(req.body);
    await newProduct.save();
    res.redirect('/db/create')
}))

app.get('/db/search/', wrapSync(async(req, res) => {
    const keyword = req.query.q;
    const searchResults = await Product.find(({ $text: { $search: keyword } }))
    if (searchResults.length === 0) {
        let error = "Sorry we couldn't find any results";
        res.render('database/noResults', { error })
    } else {
        res.render('database/results', { searchResults })
    }
}))

app.get('/db/list', wrapSync(async(req, res) => {
    const allProducts = await Product.find({})
    res.render('database/list', { allProducts })
}))

app.get('/db/update/:id', wrapSync(async(req, res) => {
    const { id } = req.params;
    const updateProduct = await Product.findById(id)
    if (!updateProduct) {
        throw new AppError("There's no such product", 404)
    }
    res.render('database/update', { updateProduct })
}))

app.get('/db/delete/:id', wrapSync(async(req, res) => {
    const { id } = req.params;
    const deleteProduct = await Product.findByIdAndDelete(id)
    res.redirect('/db/list')
}))

app.put('/db/update/:id', wrapSync(async(req, res) => {
    const { id } = req.params;
    req.body.cat = req.body.cat.toUpperCase();
    const updated = await Product.findByIdAndUpdate(id, req.body, { runValidators: true, new: true, useFindAndModify: false })
    res.redirect('/db/list')
}))

app.use((req, res, next) => {
    let error = "Sorry we couldn't find what you're looking for"
    res.render('database/noResults', { error })
})