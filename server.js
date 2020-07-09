const express = require("express");
const bcrypt = require("bcrypt");
const saltRounds = 10;
const cors = require("cors");
const Knex = require("knex");
const Clarifai = require("clarifai");

const db = Knex({
  client: "pg",
  connection: {
    host: "127.0.0.1",
    user: "postgres",
    password: "test",
    database: "facetracking",
  },
});

const app = express();

app.use(express.json());
app.use(cors());

const Clarifaiapp = new Clarifai.App({
  apiKey: "#####",
});

app.get("/", (req, res) => {
  res.send(database.users);
});

app.post("/signin", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(401).json("fields must not be empty");
  }
  db.select("email", "hash")
    .from("login")
    .where("email", "=", email)
    .from("login")
    .then((data) => {
      const isValid = bcrypt.compareSync(password, data[0].hash);
      if (isValid) {
        return db
          .select("*")
          .from("users")
          .where("email", "=", email)
          .then((user) => {
            res.json(user[0]);
          })
          .catch((err) => res.status(400).json("unable to get user"));
      } else {
        res.status(400).json("wrong credentials");
      }
    })
    .catch((err) => res.status(400).json("wrong credentials"));
});

app.post("/register", (req, res) => {
  const { email, name, password } = req.body;
  // bcrypt.hash(password, saltRounds, function (err, hash) {
  //   // Store hash in your password DB.
  //   console.log(hash);
  // });
  if (!email || !password || !name) {
    return res.status(401).json("fields must not be empty");
  }
  const hash = bcrypt.hashSync(password, saltRounds);
  db.transaction((trx) => {
    trx
      .insert({
        hash: hash,
        email: email,
      })
      .into("login")
      .returning("email")
      .then((loginEmail) => {
        return trx("users")
          .returning("*")
          .insert({
            email: loginEmail[0],
            name: name,
            joined: new Date(),
          })
          .then((user) => {
            res.json(user[0]);
          });
      })
      .then(trx.commit)
      .catch(trx.rollback);
  }).catch((err) => res.status(400).json("Unable to Register"));
});

app.get("/profile/:id", (req, res) => {
  const { id } = req.params;

  db.select("*")
    .from("users")
    .where({
      id: id,
    })
    .then((user) => {
      if (user.length) {
        res.json(user[0]);
      } else {
        res.status(400).json("Not Found");
      }
    })
    .catch((err) => res.status(400).json("Error Getting user"));
});

const handleApiCall = (req, res) => {
  Clarifaiapp.models
    .predict(
      Clarifai.FACE_DETECT_MODEL,
      // URL
      req.body.input
    )
    .then((data) => {
      res.json(data);
    })
    .catch((err) => res.status(400).json("Unable to work with API"));
};

app.post("/imageurl", (req, res) => {
  handleApiCall(req, res);
});

app.put("/image", (req, res) => {
  const { id } = req.body;
  db("users")
    .where("id", "=", id)
    .increment("entries", 1)
    .returning("entries")
    .then((entries) => {
      res.json(entries[0]);
    })
    .catch((err) => res.status(400).json("Unable to get entries"));
});

/*
bcrypt.hash(myPlaintextPassword, saltRounds).then(function(hash) {
  // Store hash in your password DB.
});
// Load hash from your password DB.
bcrypt.compare(myPlaintextPassword, hash).then(function(result) {
  // result == true
});
bcrypt.compare(someOtherPlaintextPassword, hash).then(function(result) {
  // result == false
});*/

app.listen(3001, () => {
  console.log("app is listening at port 3001");
});

/*
/ --> res = this is working
/signin --> POST = success/fail
/register --> POST = user
/profile/: userId --> GET = user
/image  --> PUT --> user

*/
