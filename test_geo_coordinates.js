var geo = require('./geo_coordinates');

// test_encode_single();

test_decode_polyline();

function test_encode_single() {
	var val = geo.encodePolylineCoordinate(-179.9832104);
	if (val === '`~oia@') {
		console.log("Test encode passed");
	} else {
		console.log("Test failed, value was:", val);
	}
	
	console.log(geo.encodePolylineCoordinate(38.5));
}

function test_decode_polyline() {
	var s = '_p~iF~ps|U_ulLnnqC_mqNvxq`@';
	var points = geo.decodePolyline(s);
	console.log(points);
	var s_ = geo.encodePolyline(points);
	if (s_ === s) {
		console.log("Test encode decode passed");
	} else {
		console.log("Test failed, expected:", s, "actual:", s_);
	}
}