var express = require('express');
var router = express.Router();
var path = require('path');
var fs = require('fs');
var csvStringify = require('csv-stringify');
var moment = require('moment');
moment.locale('ro');
var math = require('mathjs');
var childProcess = require('child_process');
var phantomjs = require('phantomjs-prebuilt');
var binPath = phantomjs.path;

var cookieFile = path.join(__dirname, '../var/cookie-jars/cookies-' + moment().format('X') + '.txt');
var childArgs = [
  '--cookies-file="' + cookieFile + '"',
    path.join(__dirname, '../scripts/main.js')
]
var pontajCsvFile = path.join(__dirname, '../var/csv/pontaj-g' + moment().format('X') + '.csv');

/* GET home page. */
router.get('/', function(req, res, next) {
    res.render('index', { title: 'Raport pontaj' });
})

router.post('/generate', function(req, res, next) {
    console.log('Fetching...')

    var year = req.body.year;
    var month = req.body.month;

    childArgs.push(process.env.USERNAME || req.body.username);
    childArgs.push(process.env.PASSWORD || req.body.password);
    childArgs.push(process.env.COMPANY || req.body.company);
    childArgs.push(year);
    childArgs.push(month);
    childArgs.push(process.env.DOMAIN);

    // generate files
    fs.writeFileSync(cookieFile, '');
    fs.writeFileSync(pontajCsvFile, '');

    var result = childProcess.execFileSync(binPath, childArgs);
    // var result = fs.readFileSync(path.join(__dirname, '../var/pontaj.json'));
    var pontaj = JSON.parse(result.toString());

    // add hours
    var pontajWithHours = [];
    pontaj.forEach(function(row) {
        var newRow = [row[0]];
        for (i = 1; i <= row.length; i++) {
            
            if (row[i] == '8') {;
                // generate start and end hours, wih a differrence between 7h48m and 8h17m, +1 h break
                var startHour = moment(Date.parse('2017-01-01 08:' + math.randomInt(38, 59)));
                var endHour = moment(startHour).add(math.randomInt(8*60+48, 9*60+17), 'minutes');

                var totalMinutesDiff = endHour.diff(startHour, 'minutes');
                var hoursDiff = math.floor(totalMinutesDiff / 60);
                var minutesDiff = totalMinutesDiff - hoursDiff*60;
                newRow.push(hoursDiff + 'h ' + minutesDiff + 'm');
                newRow.push(startHour.format('HH:mm'));
                newRow.push(endHour.format('HH:mm'));
                newRow.push('1h');
            } else {
                newRow.push(row[i]);
                newRow.push("-");
                newRow.push("-");
                newRow.push("-");
            }
        }

        pontajWithHours.push(newRow);
    });

    var columns = [
        'Angajat'
    ];
    for (i = 1; i < pontaj[0].length; i++) {
        var dateHeader = moment(Date.parse(year + '-' + month + '-' + i)).format('DD dd');
        columns.push(dateHeader);
        columns.push("Sosire");
        columns.push("Plecare");
        columns.push("Pauza");
    }
    
    csvStringify(pontajWithHours, {header: true, columns: columns}, function(err, output) {
         fs.writeFileSync(pontajCsvFile, output);
         res.download(pontajCsvFile, function (err) {
            fs.unlinkSync(cookieFile);
            fs.unlinkSync(pontajCsvFile);

            if (err) throw err;
         });
    });
})

module.exports = router;