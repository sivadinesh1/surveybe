const express = require("express");
const router = express.Router();

const mysql = require("mysql");
const moment = require("moment-timezone");
var request = require("request");

var http = require("http");

const fs = require("fs");

require("dotenv/config");
const sgMail = require("@sendgrid/mail");
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

var app = express();

const socketIo = require("socket.io");
const server = http.Server(app);
const io = socketIo(server);

server.listen(4444, function(req, res) {
  console.log("listen at 4444!");
});

io.on("connection", socket => {
  socket.emit("hello", {
    message: "Hello World",
    id: socket.id
  });

  socket.on("clientdata", data => {
    console.log(data);
  });
});

const connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "filia",
  database: "survey",
  charset: "utf8"
});

// signin
// router.post("/signin", (req, res) => {
//   let phonenumber = req.body.phonenumber;
//   let password = req.body.password;

//   let query = `select * from user where mobilenumber = '${phonenumber}' and pass = '${password}'`;

//   connection.query(query, function (err, data) {
//     if (data != null && data.length > 0) {
//       console.log("object pass match" + JSON.stringify(data));
//       console.log("object..." + data[0].userId);
//       res.json({
//         result: "OK",
//         role: data[0].role,
//         userid: data[0].id,
//         username: data[0].username
//       });
//     } else if (err) {
//       console.log("Error while signing in  " + err);
//     } else {
//       console.log("object pass mismatch");
//       res.json({
//         result: "NOTOK"
//       });
//     }
//   });
// });

/***
 * Login and fetch add details of the user, including company he has created and the roles of the user
 */

// signin
router.post("/signin", (req, res) => {
  let phonenumber = req.body.phonenumber;
  let password = req.body.password;

  let query = `select 
    u.id as userid,
    u.username as username,
    u.pass as password,
    
    u.isactive as isactive,
    u.registered_date as registered_date,
    c.id as company_id,
    c.company_name as company_name,
    c.created_by as company_createdby,
    c.company_shortcode as company_shortcode,
    c.company_tagline as company_tagline,
    c.company_logo as company_logo,
    
    c.company_phone as company_phone,
    c.company_email as company_email,
    c.company_website as company_website,
    c.isactive as is_company_active,
    r.description as user_role

    from
    user u,
    user_company uc,
    company c,
    role r
    where
    u.id = uc.user_id and
    c.id = uc.company_id and
    r.id = uc.role_id and
   
    c.isactive = 'Y' and
    u.mobilenumber = '${phonenumber}' and u.pass = '${password}'`;

  // console.log("object query >> " + query);

  connection.query(query, function(err, data) {
    if (data != null && data.length > 0) {
      console.log("object pass match" + JSON.stringify(data));

      res.json({
        result: "OK",
        data: data
      });
    } else if (err) {
      console.log("Error while signing in  " + err);
    } else {
      console.log("object pass mismatch");
      res.json({
        result: "NOTOK"
      });
    }
  });
});

/**
 STATUS - 

 U - UPCOMING
 C - SURVEY COMPLETED
 H - SURVEY IN HOLD
 L - SURVEY LIVE
*/
router.get("/user-surveys-status/:userid/:status", (req, res) => {
  let userid = req.params.userid;
  let status = req.params.status;

  let query = ` 
        select survey.* from survey, user  
        where 
        user.id = survey.createdby and
        user.isactive = 'Y' and
        survey.isactive = '${status}' and
        user.id = '${userid}' order by createddate desc`;

  // console.log("object query >> " + query);

  connection.query(query, function(err, data) {
    if (err) {
      console.log("object error " + err);
    } else {
      res.json(data);
    }
  });
});

router.get("/dashboard-user-survey/:companyid/:status", (req, res) => {
  let companyid = req.params.companyid;
  let status = req.params.status;

  let query = ` 
    select 
    s.id as survey_id,
    s.createdby as survey_created_by,
    s.surveyname as survey_name,
    s.surveyvenue as survey_venue,
    s.surveycode as survey_code,
    s.surveydate as survey_date,
    s.servicetype as service_type,
    s.isactive as issurvey_active,
    s.valid_from as survey_valid_from,
    s.valid_till as survey_valid_till,
    s.noofresponse as survey_no_of_response,
    s.max_respondents as survey_max_respondents,
    s.createddate as survey_createddate
    from 
    survey s, 
    user u,
    company c 
    where 
    u.id = s.createdby and
    c.id = s.company_id and
    u.isactive = 'Y' and
    s.isactive = '${status}' and
    s.company_id = '${companyid}'
    order by s.createddate desc `;

  // console.log("object query >> " + query);

  connection.query(query, function(err, data) {
    if (err) {
      console.log("object error " + err);
    } else {
      res.json(data);
    }
  });
});

// Send OTP
router.post("/sendotp/:mobilenumber", (req, res) => {
  let phonenumber = req.params.mobilenumber;

  let sql = ` select count(*) as cnt from user where mobilenumber = '${phonenumber}' `;

  let phonenumbercount = 0;

  connection.query(sql, function(err, data1) {
    if (err) {
      console.log("object error " + err);
    } else {
      let count = JSON.stringify(data1);
      console.log("object.." + data1[0].cnt);
      phonenumbercount = data1[0].cnt;

      if (+phonenumbercount > 0) {
        res.json("DUPLICATE_PHONO");
        return;
      } else {
        var options = {
          method: "GET",
          url: `https://2factor.in/API/V1/4d830b8e-7c1a-11e8-a895-0200cd936042/SMS/${phonenumber}/AUTOGEN/survey`,
          headers: {
            "content-type": "application/x-www-form-urlencoded"
          },
          form: {}
        };

        request(options, function(error, response, data) {
          if (error) throw new Error(error);

          console.log(data);
          res.json(data);
        });
        return;
      }
    }
  });
});

// Verify OTP
router.post("/verifyotp/:otpsessionid/:enteredotp", (req, res) => {
  console.log("inside sendotp..");

  let otpsessionid = req.params.otpsessionid;
  let enteredotp = req.params.enteredotp;

  var options = {
    method: "GET",
    url: `https://2factor.in/API/V1/4d830b8e-7c1a-11e8-a895-0200cd936042/SMS/VERIFY/${otpsessionid}/${enteredotp}`,
    headers: {
      "content-type": "application/x-www-form-urlencoded"
    },
    form: {}
  };

  request(options, function(error, response, data) {
    if (error) {
      console.log("err" + data);
      res.json(data);
    } else {
      console.log(data);
      res.json(data);
    }
  });
});

router.post("/add-user", (req, res) => {
  console.log("object...." + JSON.stringify(req.body));
  let phonenumber = req.body.phonenumber;
  let firstname = req.body.name;
  let companyname = req.body.companyname;
  let password = req.body.password;
  let langage = "english";
  console.log("object..phonenumber." + phonenumber);
  console.log("object..firstname." + firstname);
  console.log("object..companyname." + companyname);

  var today = new Date();
  today = moment(today).format("YYYY-MM-DD HH:mm:ss");
  let query = `INSERT INTO user 
              ( mobilenumber, username, pass, companyname, isactive, registered_date) 
              values ( '${phonenumber}', '${firstname}', '${password}', '${companyname}', 'Y', '${today}')`;

  connection.query(query, function(err, data) {
    if (err) {
      console.log("object..." + err);
      res.status(500).json({
        result: "NOTOK",
        message: `ERROR While updating.`
      });
    } else {
      let userid = data.insertId;
      console.log("object inside else ..." + userid);

      res.json({
        result: "OK",
        newuserid: userid
      });
    }
  });
});

router.post("/add-member", (req, res) => {
  console.log("object...." + JSON.stringify(req.body));
  let phonenumber = req.body.phone;
  let firstname = req.body.name;
  let roleid = req.body.role;
  let password = `${phonenumber}@1234`;
  let companyid = req.body.companyid;

  let sql = ` select count(*) as cnt from user where mobilenumber = '${phonenumber}' `;

  let phonenumbercount = 0;

  connection.query(sql, function(err, data1) {
    if (err) {
      console.log("object error " + err);
    } else {
      let count = JSON.stringify(data1);
      console.log("object.." + data1[0].cnt);
      phonenumbercount = data1[0].cnt;

      if (+phonenumbercount > 0) {
        res.json("DUPLICATE_PHONO");
      }
    }
  });

  if (+phonenumbercount === 0) {
    var today = new Date();
    today = moment(today).format("YYYY-MM-DD HH:mm:ss");
    let query = `INSERT INTO user 
              ( mobilenumber, username, pass, isactive, registered_date) 
              values ( '${phonenumber}', '${firstname}', '${password}',   'Y', '${today}')`;

    connection.query(query, function(err, data) {
      if (err) {
        console.log("object..." + err);
        res.status(500).json({
          result: "NOTOK",
          message: `ERROR While updating.`
        });
      } else {
        let userid = data.insertId;
        console.log("object inside else ..." + userid);

        let query = `INSERT INTO user_company 
              ( user_id, company_id, role_id) 
              values ( '${userid}', '${companyid}', '${roleid}' )`;

        connection.query(query, function(err, data) {
          if (err) {
            console.log("object..." + err);
            res.status(500).json({
              result: "NOTOK",
              message: `ERROR While updating.`
            });
          } else {
            //let userid = data.insertId;
            //   console.log("object inside else ..." + userid);

            res.json({
              result: "OK",
              newuserid: userid
            });
          }
        });

        // res.json({
        //   result: "OK",
        //   newuserid: userid
        // });
      }
    });
  }
});

router.post("/add-company", (req, res) => {
  console.log("object...." + JSON.stringify(req.body));

  let filename = req.body.filename.replace(/ /g, "-");

  let company_name = req.body.company_name;
  let company_shortcode = req.body.company_shortcode;
  let company_tagline = req.body.company_tagline;
  let company_phone = req.body.company_phone;

  let company_email = req.body.company_email;

  if (!company_email) {
    company_email = "";
  }

  let company_website = req.body.company_website;

  if (!company_website) {
    company_website = "";
  }

  let isactive = "Y";
  let addressline1 = req.body.addressline1;
  let addressline2 = req.body.addressline2;

  if (!addressline2) {
    addressline2 = "";
  }

  let city = req.body.city;
  let state = req.body.state;
  let pincode = req.body.pincode;
  let loggedinuser = req.body.loggedinuser;
  let company_logo = "";

  var today = new Date();
  today = moment(today).format("YYYY-MM-DD HH:mm:ss");

  let query = `INSERT INTO company (company_name, created_by, company_shortcode, company_tagline, company_logo, company_phone,
              company_email, company_website, isactive, addressline1, addressline2, city, state, pincode)
              VALUES
                ( '${company_name}', '${loggedinuser}', '${company_shortcode}', '${company_tagline}','${company_logo}', '${company_phone}',
                '${company_email}', '${company_website}', '${isactive}', '${addressline1}', '${addressline2}', '${city}', '${state}', 
                '${pincode}')`;

  connection.query(query, function(err, data) {
    if (err) {
      console.log("object..." + err);
      res.status(500).json({
        result: "NOTOK",
        message: `ERROR While updating.`
      });
    } else {
      let companyid = data.insertId;
      console.log("object inside else ..." + companyid);

      let query = `INSERT INTO user_company 
            ( user_id, company_id, role_id) 
            values ( '${loggedinuser}', '${companyid}', '2' )`;

      connection.query(query, function(err, data) {
        if (err) {
          console.log("object..." + err);
          res.status(500).json({
            result: "NOTOK",
            message: `ERROR While updating.`
          });
        } else {
          res.json({
            result: "OK",
            company_id: companyid
          });
        }
      });

      let dataObj = req.body.file;

      //dnd
      //var base64Data = dataObj.replace(/^data:application\/pdf;base64,/, "");
      //  Once you create the buffer with the proper encoding, you just need to write the buffer to the file.
      var base64Data = dataObj.split(",")[1];

      var dir = process.env.UPLOAD_PATH + companyid;

      //      debug(dir);

      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
      }

      let buff = Buffer.from(base64Data, "base64");

      fs.writeFileSync(dir + "/" + filename, buff);

      // res.json({
      //   result: "OK",
      //   newuserid: companyid
      // });
    }
  });
});

router.post("/edit-company", (req, res) => {
  console.log("object...." + JSON.stringify(req.body));

  let company_id = req.body.company_id;
  let company_name = req.body.company_name;
  let company_shortcode = req.body.company_shortcode;
  let company_tagline = req.body.company_tagline;
  let company_phone = req.body.company_phone;

  let company_email = req.body.company_email;
  let company_website = req.body.company_website;
  let isactive = "Y";
  let addressline1 = req.body.addressline1;
  let addressline2 = req.body.addressline2;
  let city = req.body.city;
  let state = req.body.state;
  let pincode = req.body.pincode;
  let loggedinuser = req.body.loggedinuser;
  let company_logo = "";

  console.log("object >> " + JSON.stringify(req.body));

  var today = new Date();
  today = moment(today).format("YYYY-MM-DD HH:mm:ss");

  let query = `update company set company_name = '${company_name}', company_shortcode = '${company_shortcode}',
  company_tagline = '${company_tagline}', company_phone = '${company_phone}', company_email = '${company_email}',
  company_website = '${company_website}', addressline1 = '${addressline1}', addressline2 = '${addressline2}',
  city = '${city}', state = '${state}', pincode = '${pincode}', 
  updated_by = '${loggedinuser}', updateddate = '${today}'
  where id = '${company_id}';
  `;

  connection.query(query, function(err, data) {
    if (err) {
      console.log("object..." + err);
      res.status(500).json({
        result: "NOTOK",
        message: `ERROR While updating.`
      });
    } else {
      let companyid = data.insertId;
      console.log("object inside else ..." + companyid);

      res.json({
        result: "OK",
        newuserid: companyid
      });
    }
  });
});

router.post("/add-survey", (req, res) => {
  let createdby = req.body.loggedinuser;
  let surveyname = req.body.surveyname;
  let surveyvenue = req.body.surveyvenue;
  let surveydate = req.body.surveydate;
  let servicetype = req.body.servicetype;
  let survey_lang = req.body.language;
  let survey_industry = req.body.industry;
  let company_id = req.body.companyid;
  let needcontactflag = req.body.needcontactflag;
  let surveycode = req.body.surveycode;
  console.log("object" + surveydate);

  let surveydateformatted = moment
    .utc(surveydate, "YYYY-MM-DD  HH:mm a")
    .format("YYYY-MM-DD HH:mm");

  console.log("object......." + surveydateformatted);

  var today = moment()
    .utcOffset("+05:30")
    .format("YYYY-MM-DD HH:mm");
  console.log("object..tiday....." + today);

  today = moment(today).format("YYYY-MM-DD HH:mm:ss");
  let query = `INSERT INTO survey 
              ( createdby, company_id, surveyname, surveyvenue, surveydate, servicetype, isactive, survey_lang, survey_industry, needcontactdetails, createddate) 
              values ( '${createdby}', '${company_id}', '${surveyname}',  '${surveyvenue}',  '${surveydateformatted}', '${servicetype}', 'U', 
              '${survey_lang}', '${survey_industry}', '${needcontactflag}', '${today}')`;

  connection.query(query, function(err, data) {
    if (err) {
      console.log("object..." + err);
      res.status(500).json({
        result: "NOTOK",
        message: `ERROR While updating.`
      });
    } else {
      let surveyid = data.insertId;
      let surveycode = `survey${surveyid}`;
      console.log("object inside else ..." + surveyid);

      let sql = `update survey set surveycode = '${surveycode}' where id = '${surveyid}'`;
      connection.query(sql, function(err, data) {
        if (err) {
          console.log("error updating surveycode");
        } else {
          console.log("successfully updated surveycode");
        }
      });

      res.json({
        result: "OK",
        newsurvey: surveyid
      });
    }
  });
});

router.post("/add-survey-question", (req, res) => {
  console.log(" inside apply jobs ...");
  let yourJsonObj = req.body;

  let surveyid = req.body.surveyid;
  let question = req.body.question;

  let question_sequence = req.body.question_sequence;
  let created_by = req.body.loggedinuser;
  let lang = req.body.lang;
  let industry = req.body.industry;

  var objValue = yourJsonObj.options;

  var today = new Date();
  today = moment(today).format("YYYY-MM-DD HH:mm:ss");
  let query = `INSERT INTO surveyquestion 
              ( surveyid, question, optiongroupname, question_sequence, created_by, isactive, createddate) 
              values ( '${surveyid}', '${question}', '${surveyid}',  '${question_sequence}', '${created_by}', 'Y', '${today}')`;

  connection.query(query, function(err, data) {
    if (err) {
      console.log("object..." + err);
      res.status(500).json({
        result: "NOTOK",
        message: `ERROR While updating.`
      });
    } else {
      let questionid = data.insertId;

      let sql = `update surveyquestion set optiongroupname = '${surveyid}-${questionid}' where surveyid = '${surveyid}' and id = '${questionid}'`;

      console.log("object >>>>>>>> " + sql);

      connection.query(sql, function(err, data) {
        if (err) {
          console.log("object..." + err);
        } else {
        }
      });

      objValue.forEach((element, index) => {
        console.log(" new >> object" + element.option);

        let queryinsert = `INSERT INTO optiongroup ( lang, industry, groupname, option_sequence, res_options)
        VALUES
          ('${lang}', '${industry}', '${surveyid}-${questionid}', '${index}', '${
          element.option
        }')`;

        connection.query(queryinsert, function(err, data) {
          if (err) {
            console.log("object..." + err);
          } else {
            let profileid = data.insertId;
          }
        });
      });

      res.json({
        result: "OK",
        newquestionid: questionid
      });
    }
  });
});

// console.log(' inside apply jobs ...');
// let yourJsonObj = req.body;

// var objectKeysArray = Object.keys(yourJsonObj);
// objectKeysArray.forEach(function (objKey) {
//   console.log('object..KEY...' + JSON.stringify(objKey));
//   var objValue = yourJsonObj[objKey];
//   console.log('object..VAL.' + JSON.stringify(objValue));

//   var today = new Date();
//   today = moment(today).format("YYYY-MM-DD HH:mm:ss");
//   let query = `INSERT INTO enquiry_detail ( enquiry_id, partno, qty) values ( '${objValue.enquiryid}','${objValue.partno}','${objValue.quantity}')`;

//   connection.query(query, function (err, data) {

//     if (err) {
//       console.log('object...' + err);

//     }

//   });

// });

router.post("/add-response", (req, res) => {
  var today = moment()
    .utcOffset("+05:30")
    .format("YYYY-MM-DD HH:mm");

  console.log(" INSIDE ADD RESPONSE  ...");
  let yourJsonObj = req.body;

  var objectKeysArray = Object.keys(yourJsonObj);
  console.log("object keys >> " + JSON.stringify(objectKeysArray));
  objectKeysArray.forEach(function(objKey) {
    console.log("object..KEY..." + JSON.stringify(objKey));

    var objValue = yourJsonObj[objKey];
    console.log("object..VAL." + JSON.stringify(objValue));

    let query = `INSERT INTO response (surveyid, survey_responseid, questionid, optionid, otherresponse, createddate) 
  VALUES( '${objValue.surveyid}', '${objValue.surveyresponseid}', '${
      objValue.questionid
    }', '${objValue.optionid}', '${objValue.otherresponse}', 
  '${today}')`;

    connection.query(query, function(err, data) {
      if (err) {
        console.log("object..." + err);
        res.status(500).json({
          result: "NOTOK",
          message: `ERROR While updating.`
        });
      } else {
        console.log("INSERTING RECORDS");

        let sql = `select *
        from
        response rs,
        surveyquestion sq,
        optiongroup og,
        survey sv
        where
        sq.id = rs.questionid and
        sv.id = rs.surveyid and
        og.id = rs.optionid and
        rs.surveyid = '${objValue.surveyid}' `;

        console.log("QUERY " + sql);

        connection.query(sql, function(err, data) {
          if (err) {
            console.log("object error " + err);
          } else {
            io.sockets.emit("hello", data);
          }
        });
      }
    });
  });

  res.json({
    result: "OK"
  });
});

router.get("/response-options/:lang/:industry", (req, res) => {
  let lang = req.params.lang;
  let industry = req.params.industry;

  let sql = `select groupname, option_sequence, res_options from optiongroup 
  where lang = '${lang}' and industry in ('${industry}', 'generic')
  group by groupname, option_sequence, res_options`;

  connection.query(sql, function(err, data) {
    if (err) {
      console.log("object error " + err);
    } else {
      res.json(data);
    }
  });
});

router.get("/survey-short-summary/:surveyid/:selecteddate", (req, res) => {
  let surveyid = req.params.surveyid;
  let selecteddate = req.params.selecteddate;

  // select sq.question, og.res_options

  // let sql = `select *
  //     from
  //     response rs,
  //     surveyquestion sq,
  //     optiongroup og,
  //     survey sv
  //     where
  //     sq.id = rs.questionid and
  //     sv.id = rs.surveyid and
  //     og.id = rs.optionid and
  //     rs.surveyid = '${surveyid}' `;

  let sql = `select *
from
response rs,
surveyquestion sq,
optiongroup og,
survey sv
where
sq.id = rs.questionid and
sv.id = rs.surveyid and
og.id = rs.optionid and
rs.survey_responseid in (select id  from survey_responses where surveyid = '${surveyid}' and 
date(createddate) = '${selecteddate}' order by createddate )  `;

  // console.log("QUERY " + sql);

  connection.query(sql, function(err, data) {
    if (err) {
      console.log("object error " + err);
    } else {
      res.json(data);
    }
  });
});

router.get("/survey-basic-info/:surveyid", (req, res) => {
  let surveyid = req.params.surveyid;

  let sql = ` select   sv.surveyname, sv.surveycode, sv.surveyvenue, sv.surveydate, sv.servicetype, id, 
  sv.survey_lang as survey_language, sv.survey_industry as survey_industry
    from
    survey sv
    where 
    id =  '${surveyid}' `;

  console.log("QUERY survey-basic-info/:surveyid >> " + sql);

  connection.query(sql, function(err, data) {
    if (err) {
      console.log("object error " + err);
    } else {
      res.json(data);
    }
  });
});

router.get("/service-type/:lang/:industry/:servicecategory", (req, res) => {
  let lang = req.params.lang;
  let industry = req.params.industry;
  let servicecategory = req.params.servicecategory;

  let sql = `select servicetype from servicetype where lang='${lang}' and industry='${industry}' and servicecategory='${servicecategory}' `;
  // console.log('object>>>>>>' + sql);
  connection.query(sql, function(err, data) {
    if (err) {
      console.log("object error " + err);
    } else {
      res.json(data);
    }
  });
});

router.get("/survey-info-by-id/:surveyid", (req, res) => {
  let surveyid = req.params.surveyid;

  console.log("object......surveyid..." + surveyid);
  let sql = `select  sq.id, surveyid, sq.question_sequence, og.option_sequence, 
  question, optiongroupname, res_options, sq.createddate
  from 
  surveyquestion sq, 
  optiongroup og
  where 
  sq.optiongroupname = og.groupname and
  surveyid = ${surveyid}   order by sq.createddate`;

  console.log("object......QUERY..." + sql);

  connection.query(sql, function(err, data) {
    if (err) {
      console.log("object error " + err);
    } else {
      if (data.length === 0) {
        res.json({
          result: "NO-QUESTIONS",
          surveyid: surveyid
        });
      } else {
        res.json(data);
      }
    }
  });
});

router.get("/survey-info-by-code/:surveycode", (req, res) => {
  let surveycode = req.params.surveycode;

  let sql = `select surveyid, sq.id as questionid, sq.question_sequence, og.option_sequence, question, 
  optiongroupname, res_options,  og.id as optionid, sq.createddate, sv.surveycode, sv.needcontactdetails, 
  sv.survey_lang as survey_language, sv.surveypicture, sv.survey_industry
  from 
  surveyquestion sq, 
  optiongroup og,
  survey sv
  where 
  sq.optiongroupname = og.groupname and
  sv.id = sq.surveyid and 
  sv.surveycode = '${surveycode}'   order by sq.question_sequence, og.option_sequence`;

  connection.query(sql, function(err, data) {
    if (err) {
      console.log("object error " + err);
    } else {
      // console.log("survey-info-by-code >> " + JSON.stringify(data));
      res.json(data);
    }
  });
});

router.get("/check-valid-surveycode/:surveycode", (req, res) => {
  let surveycode = req.params.surveycode;

  let sql = `select count(*) as count from survey where surveycode = '${surveycode}' and isactive = 'L'`;

  connection.query(sql, function(err, data) {
    if (err) {
      console.log("object error " + err);
    } else {
      res.json(data);
    }
  });
});

router.get("/get-survey-response-count/:surveyid/:selecteddate", (req, res) => {
  let surveyid = req.params.surveyid;
  let selecteddate = req.params.selecteddate;

  let sql = `select count(*) as count from survey_responses where surveyid = '${surveyid}' and 
             date(createddate) = '${selecteddate}' `;

  console.log(
    "INSIDE /get-survey-response-count/:surveyid/:selecteddate >> " + sql
  );

  connection.query(sql, function(err, data) {
    if (err) {
      console.log("object error " + err);
    } else {
      res.json(data);
    }
  });
});

router.get("/get-survey-question-responses/:surveyquestionid", (req, res) => {
  let surveyquestionid = req.params.surveyquestionid;

  let sql = `select og.id as id, res_options
            from 
            optiongroup og,
            surveyquestion sq
            where
            sq.optiongroupname = og.groupname and
            sq.id = ${surveyquestionid} `;

  connection.query(sql, function(err, data) {
    if (err) {
      console.log("object error " + err);
    } else {
      res.json(data);
    }
  });
});

router.get("/get-user-info/:surveyid", (req, res) => {
  let surveyid = req.params.surveyid;

  let sql = `select 
c.company_name as company_name,
c.company_phone as company_phone,
c.addressline1 as addressline1,
c.addressline2 as addressline2,
c.city as city,
c.state as state,
c.pincode as pincode,
sv.surveyname,
sv.surveycode,
sv.noofresponse,
c.company_website
 from 
user ur, 
survey sv,
company c
where
sv.createdby = ur.id and
c.id = sv.company_id and
sv.id = '${surveyid}' `;

  // let sql = `select * from user, survey
  //           where
  //           survey.createdby = user.id and
  //           survey.id = '${surveyid}' `;
  console.log("object" + sql);

  connection.query(sql, function(err, data) {
    if (err) {
      console.log("object error " + err);
    } else {
      res.json(data);
    }
  });
});

router.get("/get-survey-question/:surveyid/:surveyquestionid", (req, res) => {
  let surveyid = req.params.surveyid;
  let surveyquestionid = req.params.surveyquestionid;

  let sql = `select * from surveyquestion where surveyid = ${surveyid} and id = ${surveyquestionid}`;

  connection.query(sql, function(err, data) {
    if (err) {
      console.log("object error " + err);
    } else {
      res.json(data);
    }
  });
});

router.get("/get-user/:phonenumber", (req, res) => {
  let surveyid = req.params.surveyid;
  let surveyquestionid = req.params.surveyquestionid;

  let sql = `select * from user where mobilenumber = ${phonenumber}`;

  connection.query(sql, function(err, data) {
    if (err) {
      console.log("object error " + err);
    } else {
      if (data.length === 0) {
        res.json({
          result: "NO-USER"
        });
      } else {
        res.json(data);
      }
    }
  });
});

// DELETE
router.get("/delete-question/:surveyid/:surveyquestionid", (req, res) => {
  let surveyid = req.params.surveyid;
  let surveyquestionid = req.params.surveyquestionid;

  var today = new Date();
  today = moment(today).format("YYYY-MM-DD HH:mm:ss");

  let sql = `delete from surveyquestion where  surveyid = '${surveyid}' and id = '${surveyquestionid}'`;

  connection.query(sql, function(err, data) {
    if (err) {
      console.log("object..." + err);
    } else {
      let sql = `delete from optiongroup where  groupname = '${surveyid}-${surveyquestionid}'`;

      connection.query(sql, function(err, data) {
        if (err) {
          console.log("object..." + err);
        } else {
          res.json({
            result: "OK"
          });
        }
      });

      // res.json({
      //   result: "OK"
      // });
    }
  });
});

// UPDATE

router.get("/update-survey-status/:surveyid/:status", (req, res) => {
  let surveyid = req.params.surveyid;
  let status = req.params.status;
  console.log("object " + surveyid);
  console.log("object " + status);

  var today = new Date();
  today = moment(today).format("YYYY-MM-DD HH:mm:ss");

  let query = `update survey set isactive = '${status}', updateddate = '${today}'  where id = '${surveyid}' `;
  console.log("object " + query);

  connection.query(query, function(err, data) {
    if (err) {
      console.log("object..." + err);
      res.status(500).json({
        result: "NOTOK",
        message: `ERROR While updating.`
      });
    } else {
      let phno = 0;
      let surveyname = "";

      let sql = `select * from user, survey
                  where
                  survey.createdby = user.id and
                  survey.id = '${surveyid}' `;
      console.log("object" + sql);

      connection.query(sql, function(err, data) {
        if (err) {
          console.log("object error " + err);
        } else {
          //    console.log('object >> << ' + JSON.stringify(data));
          phno = data[0].mobilenumber;
          surveyname = data[0].surveyname;

          var uploadOptions = {
            url: `https://2factor.in/API/R1/?module=TRANS_SMS&apikey=4d830b8e-7c1a-11e8-a895-0200cd936042&to=${phno}&from=SUVAIS&templatename=start-survey&var1=${surveyname}`,
            method: "GET",
            headers: {},
            formData: formData
          };

          var req = request(uploadOptions, function(err, resp, body) {
            if (err) {
              console.log("Error ", err);
            } else {
              //do not delete (DND)
              //         console.log('upload successful', body);
            }
          });
        }
      });

      var formData = {};

      // var formData = {
      //   'From': 'PUSTRS',
      //   'To': '9731616386',
      //   'TemplateName': 'SUVAIS',
      //   'VAR1': 'KONGU MAHAL'
      // };

      res.json({
        result: "OK"
      });
    }
  });
});

router.post("/update-question", (req, res) => {
  let surveyid = req.body.surveyid;
  let surveyquestionid = req.body.surveyquestionid;
  let question = req.body.question;
  let optiongroupname = req.body.optiongroupname;

  var today = new Date();
  today = moment(today).format("YYYY-MM-DD HH:mm:ss");

  let sql = `update surveyquestion set question = '${question}' , optiongroupname = '${optiongroupname}' where surveyid = '${surveyid}' and id = '${surveyquestionid}'`;

  console.log("object >>>>>>>> " + sql);

  connection.query(sql, function(err, data) {
    if (err) {
      console.log("object..." + err);
    } else {
      res.json({
        result: "OK"
      });
    }
  });
});

router.post("/update-survey", (req, res) => {
  let surveyid = req.body.surveyid;
  let surveyname = req.body.surveyname;
  let surveyvenue = req.body.surveyvenue;
  let surveydate = req.body.surveydate;
  let servicetype = req.body.servicetype;

  let surveydateformatted = moment
    .utc(surveydate, "YYYY-MM-DD  HH:mm a")
    .format("YYYY-MM-DD HH:mm");
  var today = new Date();
  today = moment(today).format("YYYY-MM-DD HH:mm:ss");

  let sql = `update survey set surveyname = '${surveyname}', surveyvenue = '${surveyvenue}', surveydate = '${surveydateformatted}', servicetype = '${servicetype}' where id = '${surveyid}' `;

  console.log("object >>>>>>>> " + sql);

  connection.query(sql, function(err, data) {
    if (err) {
      console.log("object..." + err);
    } else {
      res.json({
        result: "OK"
      });
    }
  });
});

router.get("/update-password/:phonenumber/:pass", (req, res) => {
  let phonenumber = req.params.phonenumber;
  let pass = req.params.pass;
  console.log("object " + surveyid);
  console.log("object " + status);

  var today = new Date();
  today = moment(today).format("YYYY-MM-DD HH:mm:ss");

  let query = `update user set pass = '${pass}'  where mobilenumber = '${phonenumber}' `;
  console.log("object " + query);

  connection.query(query, function(err, data) {
    if (err) {
      console.log("object..." + err);
      res.status(500).json({
        result: "NOTOK",
        message: `ERROR While updating.`
      });
    } else {
      res.json({
        result: "OK"
      });
    }
  });
});

router.get("/companies-list/:userid", (req, res) => {
  let userid = req.params.userid;

  let sql = `
  select 
    u.id as userid,
    u.username as username,
    u.pass as password,
    
    u.isactive as isactive,
    u.registered_date as registered_date,
    c.id as company_id,
    c.company_name as company_name,
    c.created_by as company_createdby,
    c.company_shortcode as company_shortcode,
    c.company_tagline as company_tagline,
    c.company_logo as company_logo,
    
    c.company_phone as company_phone,
    c.company_email as company_email,
    c.company_website as company_website,
    c.isactive as is_company_active,
    r.description as user_role

    from
    user u,
    user_company uc,
    company c,
    role r
    where
    u.id = uc.user_id and
    c.id = uc.company_id and
    r.id = uc.role_id and
    u.id = c.created_by and
    c.isactive = 'Y' and
    c.created_by = ${userid}
  `;

  connection.query(sql, function(err, data) {
    if (err) {
      console.log("object error " + err);
    } else {
      if (data.length === 0) {
        res.json({
          result: "NO-COMPANY"
        });
      } else {
        res.json(data);
      }
    }
  });
});

router.get("/company-details/:companyid", (req, res) => {
  let companyid = req.params.companyid;
  console.log("KKKK" + companyid);

  let sql = `
  select 
        c.id as company_id,
    c.company_name as company_name,
    c.created_by as company_createdby,
    c.company_shortcode as company_shortcode,
    c.company_tagline as company_tagline,
    c.company_logo as company_logo,
    
    c.company_phone as company_phone,
    c.company_email as company_email,
    c.company_website as company_website,
    c.isactive as is_company_active,
    c.addressline1 as addressline1,
    c.addressline2 as addressline2,
    c.city as city,
    c.state as state,
    c.pincode as pincode,
    c.isactive as isactive
    

    from
   
    company c
    
    where
   c.id = ${companyid}
  `;

  connection.query(sql, function(err, data) {
    if (err) {
      console.log("object error " + err);
    } else {
      if (data.length === 0) {
        res.json({
          result: "NO-COMPANY"
        });
      } else {
        res.json(data);
      }
    }
  });
});

router.post("/add-survey-response", (req, res) => {
  console.log("object...." + JSON.stringify(req.body));
  let guestphone = req.body.phone;
  let guestname = req.body.name;
  let surveyid = req.body.surveyid;

  console.log("object..guestphone >." + guestphone);
  console.log("object..firstname >." + guestname);
  console.log("object..surveyid >." + surveyid);

  var today = new Date();
  today = moment(today).format("YYYY-MM-DD HH:mm:ss");
  let query = `INSERT INTO survey_responses 
              ( surveyid, guestname, guestphone, createddate) 
              values ( '${surveyid}', '${guestname}', '${guestphone}',  '${today}')`;

  connection.query(query, function(err, data) {
    if (err) {
      console.log("object..." + err);
      res.status(500).json({
        result: "NOTOK",
        message: `ERROR While updating.`
      });
    } else {
      let surveyresponsesid = data.insertId;
      console.log("object inside else ..." + surveyresponsesid);

      res.json({
        result: "OK",
        newsurveyresponsesid: surveyresponsesid
      });
    }
  });
});

// SELECT
//   IF(any_value(id) IS NULL, 0, count(*)) AS cnt,
//     b.Days AS date
// FROM
//     (SELECT a.Days
//     FROM (
//         SELECT curdate() - INTERVAL (a.a + (10 * b.a) + (100 * c.a)) DAY AS Days
//         FROM       (SELECT 0 AS a UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) AS a
//         CROSS JOIN (SELECT 0 AS a UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) AS b
//         CROSS JOIN (SELECT 0 AS a UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) AS c
//     ) a
//     WHERE a.Days >= curdate() - INTERVAL 30 DAY) b
// LEFT JOIN survey_responses
//     ON date(createddate) = b.Days
//     group by b.Days
// ORDER BY b.Days desc;

module.exports = router;
