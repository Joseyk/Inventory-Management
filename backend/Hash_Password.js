const bcrypt = require("bcrypt");
const password = "admin123"; // The password you want to use

bcrypt.hash(password, 10, (err, hash) => {
  console.log("Your hashed password is:", hash);
});
