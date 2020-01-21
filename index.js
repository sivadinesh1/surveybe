const express = require('express');

const mysql = require('mysql');
const moment = require('moment');

const logger = require('./middleware/logger.ts');
console.log(' 1111 ');
// const upload = require('./upload');

const cors = require('cors');
const fs = require('fs');

const app = express();

app.use(express.static('public'));

var corsOptions = {
    origin: '*',
    optionsSuccessStatus: 200
};
console.log(' 1112 ');
app.use(logger);
console.log(' 1113 ');
// app.use(function (req, res, next) {
//     res.header("Access-Control-Allow-Origin", "*");
//     res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
//     next();
// });


app.use(cors(corsOptions));

app.use(express.json({
    limit: '50mb'
}));
app.use(express.urlencoded({
    extended: false
}));

// general api routes
app.use('/api', require('./routes/api/general'));
app.use('/api/results', require('./routes/api/results'));


app.get('/openCV/:id/:filename', function (req, res) {

    console.log('object ..SEND ME PDF..' + req.params.id);
    console.log('object ..SEND ME filename PDF..' + req.params.filename);


    var dir = process.env.UPLOAD_PATH;

    res.sendFile(dir + '/' + req.params.id + '/' + req.params.filename, {
        headers: {
            'Content-Type': 'application/x-pdf'
        }
    });


    console.log('object ..SEND ME PDF..' + req.params.id);

});



const PORT = process.env.PORT || 5070;

app.listen(PORT);