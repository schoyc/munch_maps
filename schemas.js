var userSchema = new mongoose.Schema({
	name : String,
	username : String,
	password : String,

	trips : [Object.id],
	accountType : String,
	searchCount
});

var tripSchema = new mongoose.Schema({
	name : String,
	origin : {
		type : Map,
		of : Number
	},
	dest : {
		type : Map,
		of : Number
	},
	points : [
		{
			lat : String,
			lon : String
		}
	],
	routes : [Object.id],
	notes : String
	user : Object.id
});

var routeSchema = new mongoose.Schema({
	name : String,
	points : [
		{
			lat : String,
			lon : String
		}
	],
	notes : String,
	trip : Object.id
});
