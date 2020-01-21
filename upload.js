const IncomingForm = require('formidable').IncomingForm;
//const fs = require('fs');

module.exports = function upload(req, res) {
  var form = new IncomingForm();
  console.log('111111');

  var fileNames = [];

  form.uploadDir = './upload';
  form.keepExtensions = true;
  form.maxFieldsSize = 10 * 1024 * 1024;

  form.multiples = true;

  form
    .on('error', function (err) {
      res.json({
        result: "fail",
        data: {},
        message: `Cannot Upload images. Error is : ${err}`
      });
      // throw err;
    })

    .on('field', function (field, value) {
      //receive form fields here
    })

    /* this is where the renaming happens */
    .on('fileBegin', function (name, file) {
      //rename the incoming file to the file's name
      file.path = form.uploadDir + "/" + file.name;
    })

    .on('file', function (field, file) {
      fileNames.push(file.name);
      //On file received
    })

    .on('progress', function (bytesReceived, bytesExpected) {
      //self.emit('progess', bytesReceived, bytesExpected)

      var percent = (bytesReceived / bytesExpected * 100) | 0;
      process.stdout.write('Uploading: %' + percent + '\r');
    })

    .on('end', function () {

      res.json({
        result: "ok",
        data: fileNames,
        numberOfImages: fileNames.length,
        message: "Upload images successfully"
      });

    });

  form.parse(req);


};


// form.parse(req, function (err, fields, files) {
//   res.write('File uploaded');
//   res.end();
// });

// form.parse(req, function (err, fields, files) {
//   var oldpath = files.filetoupload.path;
//   var newpath = '/Users/sivadineshm/downloads/' + files.filetoupload.name;
//   fs.rename(oldpath, newpath, function (err) {
//     if (err) throw err;
//     res.write('File uploaded and moved!');
//     res.end();
//   });
// });

//form.on('file', (field, file) => {
// Do something with the file
// e.g. save it to the database
// you can access it using file.path
//  console.log('object are u here ..');


// console.log('Uploaded ' + file.name);

//  let readMe = fs.readFileSync('readMe.txt', 'utf8');
// fs.writeFileSync(readMe);

// fs.readFile('readMe.txt', 'utf8', function (err, data) {
//   console.log('object' + data);
// });


// console.log('PRING >> ' + readMe);

//});
// form.on('end', () => {
//   res.json();
// });

// };



// // Creates /tmp/a/apple, regardless of whether `/tmp` and /tmp/a exist.
// fs.mkdir('/tmp/a/apple', {
//   recursive: true
// }, (err) => {
//   if (err) throw err;
// });


// fs.promises.mkdir('/tmp/a/apple', {
//   recursive: true
// }).catch(console.error);