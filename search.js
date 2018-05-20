var unirest = require("unirest");
var geo = require("./geo_coordinates");


var YELP_SEARCH = 'https://api.yelp.com/v3/businesses/search';
var GMAPS_SEARCH = 'https://maps.googleapis.com/maps/api/directions/json';

module.exports = {
  find_businesses: find_businesses, 
}

// TODO: Add other params like arrival time, transit mode...
async function find_businesses(search_term, origin, destination, radius) {
  var directionsPromise = new Promise(function (resolve, reject) {
    unirest.get(GMAPS_SEARCH)
    .query({
      origin: origin,
      destination: destination,
      key: process.env.GOOGLE_API_KEY
    })
    .end(function (response) {
      if (response.code != 200) {
        reject(response.body);
      } else {
        var body = response.body;
        resolve(body);
      }
    });
  });

  var directions = await directionsPromise;
  console.log(directions);

  var routes = directions.routes;

  var results = await find_businesses_along_route(search_term, routes[0], radius);
  console.log("GOT THE RESULTS");
  return results;
}

function make_search_result(business, start_lat, start_lon, end_lat, end_lon) {
  var search_result = {};
  search_result.business = business;
  search_result.step = {
    start: {
      lat: start_lat,
      lon: start_lon
    },
    end: {
      lat: end_lat,
      lon: end_lon
    }
  };

  search_result.dist_to_route = geo.cross_track_distance(
                                  start_lat, start_lon,
                                  end_lat, end_lon,
                                  business.coordinates.latitude,
                                  business.coordinates.longitude);

  return search_result;
}
async function find_businesses_along_leg(search_term, lat1, lon1, lat2, lon2, radius) {
  var d = geo.distance(lat1, lon1, lat2, lon2);

  var r = 0;

  var business_promises = [];
  while (r < d - radius) {
    var f = r / d;
    var point = geo.intermediate_point(lat1, lon1, lat2, lon2, f);
    var promise = find_businesses_at_point(search_term, point.lat, point.lon, radius);
    business_promises.push(promise);
    r += radius;
  }

  try {
    let business_results = await Promise.all(business_promises);
    var businesses = [];
    var ids = new Set();
    for (var i = 0; i < business_results.length; i++) {
      var result = business_results[i];
      for (var j = 0; j < result.length; j++) {
        var business = result[j];
        if (!ids.has(business.id)) {
          // businesses.push(
          //   make_search_result(business, lat1, lon1, lat2, lon2)
          // );
          businesses.push(business);
          ids.add(business.id);
        }
      }
    }
    return businesses;
  } catch (error) {
    //TODO: Handle errors correctly
    console.log("Along leg");
    console.log(error);
    return null;
  }

}

// returns Promise
function find_businesses_at_point(search_term, lat, lon, radius) {
  // console.log("REQUEST:", search_term, lat.toString(), lon.toString(), radius);
  var promise = new Promise(function (resolve, reject) {
    unirest.get(YELP_SEARCH)
    .headers({Authorization: 'Bearer ' + process.env.YELP_API_KEY})
    .query({
      term: search_term,
      latitude: lat,
      longitude: lon,
      radius: Math.floor(radius),
      limit: 10
    })
    .end(function (response) {
      if (response.code != 200) {
        reject(response);
      } else {
        var body = response.body;
        resolve(body.businesses);
      }
    });
  });

  return promise;
}

async function find_businesses_along_route(search_term, route, radius) {
  var leg = route.legs[0];
  var steps = leg.steps;

  var all_businesses = [];
  for (var i = 0; i < steps.length; i++) {
    var step = steps[i];

    var start = step.start_location;
    var end = step.end_location;

    try {
      var businesses = await find_businesses_along_leg(search_term,
                                                start.lat, start.lng,
                                                end.lat, end.lng,
                                                radius);

      all_businesses.push(...businesses);

      // If last step, then also search final destination for businesses
      if (i == steps.length - 1) {
        var last_businesses = await find_businesses_at_point(search_term, end.lat, end.lng, radius);
        all_businesses.push(...last_businesses);
      }
    } catch (error) {
      console.log("Along route");
      console.log(error);
    }

    
  }

  return all_businesses;

}