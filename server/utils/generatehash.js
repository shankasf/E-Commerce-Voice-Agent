// utils/generateHash.js
const bcrypt = require('bcryptjs');

const password = 'password123'; // The password you want to test with
const saltRounds = 10;

bcrypt.hash(password, saltRounds, (err, hash) => {
  if (err) console.error(err);
  console.log('Use this hash in your DB:', hash);
});