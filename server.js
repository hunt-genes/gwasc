/* eslint vars-on-top: 0 */

require("babel-register");

var app = require("./src/app");
var port = process.env.PORT || 3000;

app.listen(port);
