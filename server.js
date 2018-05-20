var express = require("express");
var path = require("path");
var bodyParser = require("body-parser");
var mongoose = require("mongoose");
var unirest = require("unirest");
var fs = require("fs");

var search = require("./search");

var app = express();
var PORT = process.env.PORT || 8080;

app.use(express.static(__dirname + "/public"));
app.use(bodyParser.json());
app.listen(PORT);


// var uriString = process.env.MONGODB_URI ||
// 				process.env.MONGOHQ_URL ||
// 				'mongodb://localhost/munch_maps';

// mongoose.connect(uriString, function(err, res) {
// 	if (err) {
// 		console.log('ERROR connecting to: ' + uriString + '. ' + err);
// 	} else {
// 		console.log('Succeeded connecting to: ' + uriString);
// 	}
// });

console.log("The app is running.");

var R = 6371e3; // metres

app.get("/search", async function(req, res, next) {
	var query = req.query;
	// Need start location, end location, search term, search radius

	try {
		var results = await search.find_businesses(
												query.keyword, 
												query.origin,
												query.dest, 
												query.radius);
		console.log("Results", results.length);
		res.status(200)
				.json(results);
	} catch (error) {
		next(error);
	}
	
	

});





