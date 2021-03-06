var R = 6371e3; // metres

module.exports = {
  distance: distance,
  intermediate_point: intermediate_point,
  cross_track_distance: cross_track_distance,
  encodePolylineCoordinate: encodePolylineCoordinate,
  decodePolyline: decodePolyline,
  encodePolyline: encodePolyline
}

function toRadians(x) {
  return x * Math.PI / 180;
}

function toDegrees(x) {
  return x / Math.PI * 180;
}

/* Functions to find point in between p1 and p2
*/

function find_point_A(lat1, lon1, lat2, lon2, dist) {
  var d = distance(lat1, lon1, lat2, lon2);
  var f = dist / d;
  
  if (f >= 1.0) {
    return {
      lat: lat1,
      lon: lon1
    };
  } else {
    return intermediate_point(lat1, lon1, lat2, lon2, f);
  }
}

function find_point_B(lat1, lon1, lat2, lon2, dist) {
  var brng = bearing(lat1, lon1, lat2, lon2);
  
  return point_in_direction(lat1, lon1, brng, dist);
}

/* All functions below credited to:
   https://www.movable-type.co.uk/scripts/latlong.html
*/  

function distance(lat1, lon1, lat2, lon2) {
  var φ1 = toRadians(lat1);
  var φ2 = toRadians(lat2);
  var Δφ = toRadians(lat2-lat1);
  var Δλ = toRadians(lon2-lon1);

  var a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ/2) * Math.sin(Δλ/2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  var d = R * c;

  return d;
}

function intermediate_point(lat1, lon1, lat2, lon2, f) {
  var d = distance(lat1, lon1, lat2, lon2);
  
  var φ1 = toRadians(lat1);
  var φ2 = toRadians(lat2);
  
  var λ1 = toRadians(lon1);
  var λ2 = toRadians(lon2);
  
  var a = Math.sin((1 - f)*d/R) / Math.sin(d/R);
  var b = Math.sin(f * d/R) / Math.sin(d/R);

  var x = a*Math.cos(φ1)*Math.cos(λ1) + b*Math.cos(φ2)*Math.cos(λ2);
  var y = a*Math.cos(φ1)*Math.sin(λ1) + b*Math.cos(φ2)*Math.sin(λ2);
  var z = a*Math.sin(φ1) + b*Math.sin(φ2);
  
  return {
    lat: toDegrees(Math.atan2(z, Math.sqrt(x*x + y*y))),
    lon: toDegrees(Math.atan2(y, x))
  };
}

function bearing(lat1, lon1, lat2, lon2) {
  var φ1 = toRadians(lat1);
  var φ2 = toRadians(lat2);
  
  var λ1 = toRadians(lon1);
  var λ2 = toRadians(lon2);
  
  var y = Math.sin(λ2-λ1) * Math.cos(φ2);
  var x = Math.cos(φ1)*Math.sin(φ2) -
        Math.sin(φ1)*Math.cos(φ2)*Math.cos(λ2-λ1);
  var brng = Math.atan2(y, x);
  
  return brng;
}

function point_in_direction(lat, lon, brng, d) {
  var φ1 = toRadians(lat);
  var λ1 = toRadians(lon);
  
  var φ2 = Math.asin( Math.sin(φ1)*Math.cos(d/R) +
                    Math.cos(φ1)*Math.sin(d/R)*Math.cos(brng) );
                    
  var λ2 = λ1 + Math.atan2(Math.sin(brng)*Math.sin(d/R)*Math.cos(φ1),
                         Math.cos(d/R)-Math.sin(φ1)*Math.sin(φ2)); 
                         
  return {
    lat: φ2,
    lon: λ2
  };        
}

// Computes distance from point 3 to arc/path between point 1 and 2
function cross_track_distance(lat1, lon1, lat2, lon2, lat3, lon3) {
  var d13 = distance(lat1, lon1, lat3, lon3);

  var δ13 = d13 / R;
  var θ13 = bearing(lat1, lon1, lat3, lon3);
  var θ12 = bearing(lat1, lon1, lat2, lon2);

  var dXt = Math.asin(Math.sin(δ13)*Math.sin(θ13-θ12)) * R;

  return dXt;
}

function encodePolyline(points) {
  var coords = [];

  var prevLat = 0;
  var prevLon = 0;

  for (var i = 0; i < points.length; i++) {
    var point = points[i];

    var latOffset = point.lat - prevLat;
    var lonOffset = point.lon - prevLon;

    // console.log("latOffset", latOffset, "lonOffset", lonOffset);
    coords.push(
      encodePolylineCoordinate(latOffset),
      encodePolylineCoordinate(lonOffset)
    );

    prevLat = point.lat;
    prevLon = point.lon;
  }

  return coords.join('');

}

function encodePolylineCoordinate(coord) {
  // Step 2
  var i = Math.round(coord * 1e5);
  // Step 4
  var b = i << 1;

  // Step 5
  if (coord < 0) {
    b = ~b;
  }

  var chunks = []
  var num_bits = 1 + Math.floor(Math.log2(b));
  var mask = 0b11111;
  // Steps 6, 7
  for (var shift_amt = 0; shift_amt < num_bits; shift_amt += 5) {
    var chunk = ((b >> shift_amt) & mask);

    // if not last chunk
    if (shift_amt + 5 < num_bits) {
      // Step 8
      chunk |= 0x20;
    }

    // Step 10
    chunk += 63;
    // console.log(chunk);
    // Step 11
    chunk = String.fromCharCode(chunk);
    chunks.push(chunk);
  };
  return chunks.join('');
}

function decodePolyline(s) {
  var mask = 0b11111;

  var coordinates = [];
  var isLat = true;
  var offset = {};

  var prevLat = 0;
  var prevLon = 0;

  var i = 0;
  var c = s.charCodeAt(i);
  var chunks = [];

  // if c < 32 then last chunk
  while (i < s.length) {
    c -= 63;

    var chunk = c & mask;
    chunks.push(chunk);

    if (c < 32) {
      var coord = _chunksToCoord(chunks);
      var axis = isLat ? 'lat' : 'lon';
      offset[axis] = coord;

      chunks = [];

      // Just found longitude
      if (!isLat) {
        var lat = prevLat + offset.lat;
        var lon = prevLon + offset.lon;
        var point = {
          lat: lat,
          lon: lon,
        }
        coordinates.push(point);

        prevLat = lat;
        prevLon = lon;
      }
      isLat = !isLat;
    }

    i++;
    c = s.charCodeAt(i);
  }

  if (chunks.length != 0 || !isLat) {
    console.log("DIDN'T PARSE CORRECTLY, STILL BYTES LEFT");
  }

  // console.log(coordinates);
  return coordinates;
}

function _chunksToCoord(chunks) {
  // console.log("chunks", chunks);
  var coord = 0;
  for (var j = 0; j < chunks.length; j++) {
    var shift_amt = j * 5;
    coord |= chunks[j] << shift_amt;
  };

  // console.log("Merged chunks", coord);
  if (coord & 0x1 === 1) {
    coord = ~coord;
  }

  coord = coord >> 1;
  coord = coord / 1e5;

  // console.log("COORD:", coord);
  return coord;
}
