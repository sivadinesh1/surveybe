const express = require("express");
const router = express.Router();

const mysql = require("mysql");
const moment = require("moment-timezone");
var request = require("request");

var http = require("http");

const fs = require("fs");

require("dotenv/config");

const connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "filia",
  database: "survey",
  charset: "utf8"
});

router.get(
  "/survey-detail-summary/:surveyid/:selecteddate/:questionid/:optionid",
  (req, res) => {
    let surveyid = req.params.surveyid;
    let selecteddate = req.params.selecteddate;
    let questionid = req.params.questionid;
    let optionid = req.params.optionid;

    let sql = `select guestname, guestphone, og.res_options, sq.question, r.otherresponse, sr.vehiclenumber 
  from
  survey_responses sr,
  response r,
  optiongroup og,
  surveyquestion sq
  where
  r.surveyid = sr.surveyid and
  sr.id = r.survey_responseid and
  og.id = r.optionid and
  sq.id =  r.questionid and
  sr.surveyid = '${surveyid}' and
  date(sr.createddate) = '${selecteddate}' and
  r.questionid = '${questionid}' and r.optionid = '${optionid}'   `;

    console.log("QUERY " + sql);

    connection.query(sql, function(err, data) {
      if (err) {
        console.log("object error " + err);
      } else {
        res.json(data);
      }
    });
  }
);

router.get("/survey-results-dashboard/:surveyid", (req, res) => {
  let surveyid = req.params.surveyid;

  let query = `  
    SELECT 
      IF(any_value(id) IS NULL, 0, count(*)) AS cnt,
        b.Days AS date
    FROM 
        (SELECT a.Days 
        FROM (
            SELECT curdate() - INTERVAL (a.a + (10 * b.a) + (100 * c.a)) DAY AS Days
            FROM       (SELECT 0 AS a UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) AS a
            CROSS JOIN (SELECT 0 AS a UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) AS b
            CROSS JOIN (SELECT 0 AS a UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) AS c
        ) a
        WHERE a.Days >= curdate() - INTERVAL 30 DAY) b
    LEFT JOIN survey_responses
        ON date(createddate) = b.Days and survey_responses.surveyid = '${surveyid}'
        group by b.Days
    ORDER BY b.Days desc; `;

  // WHERE a.Days >=  '2019-04-26' ) b

  console.log("survey-results-dashboard/:surveyid query >> " + query);

  connection.query(query, function(err, data) {
    if (err) {
      console.log("object error " + err);
    } else {
      res.json(data);
    }
  });
});

module.exports = router;
