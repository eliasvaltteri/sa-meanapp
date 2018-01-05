// require all models for usage
require('./models/allmodels');

// declare the dept stop and the dest stop
// and
// initialize arrays for all ids of
// destination stop and destination stop
var dept = "";
var dest = "";
var deptIds = [];
var destIds = [];

// fetch every corresponding object from stops collection
function loadIds(dept, dest, cb) {
	Stop.find('{"name": {$in: [ dept, dest ]}}', unction(err, result) {
		if (err) throw err;

		// store all dept and dest stops' ids into their variables
		for (let i = 0; i < result.length; i++) {
			if (result[i].name === dept) deptIds.push(result[i]["@id"]);
			if (result[i].name === dest) destIds.push(result[i]["@id"]);
		}
		// output in case either or neither of the stops exist
		if (result.length === 0) { print("Neither of the stops found!"); }
		else if (deptIds.length === 0) { print("No departure stop found!"); }
		else if (destIds.length === 0) { print("No destination stop found!"); }

		// pass to results to be returned when complete
		var stuff = [ deptIds, destIds ];
		cb(complete(stuff));
	});
}

// in this function we look for either lines that 
// have the same dept and dest stop as user input OR
// lines that contain them as stops somewhere
// along the way
function searchDirect(dept, dest, cb) {
	// set query to look for any id of departure stop
	query = '{ "stop_id": { $in: deptIds } }';
	Mapping.find(query, function(err, result) {
		if (err) throw err;
		var routeIds = [];
		result.forEach(function(elem) {
			routeIds.push(elem.route_id);
		});
		// set the query to look for routes that have some stop of 
		// both dept and dest
		query = '{ "stop_id": { $in: destIds }, "route_id": { $in: routeIds } }';
		Mapping.find(query, function(err, result) {
			if (err) throw err;
			var allroutes = [];
			result.forEach(function(data) {
				allroutes.push(data.route_id);
			});
			// find the corresponding line name of id eg. 103724 -> "Bus N7"
			query = '{ "id": { $in: allroutes } }';
			Route.find(query, function(err, result) {
				if (err) throw err;
				var alldirect = [];
				result.forEach(function(data) {
					if (!alldirect.includes(data.line)) alldirect.push(data.line);
				});
				cb(complete(alldirect));
			});
		});
	});
}

// function to search for connecting routes
function searchConn(cb) {

	var deptRoutes = [];
	var x = [];
	var z = [];

	// query for 
	query = '{ $and: [ { "stop_id": { $in: deptIds } }, { "stop_id": { $nin: destIds } } ] }';
	Mapping.find(query, function(err, result) {
		if (err) throw err;
		x = result;
		result.forEach(function(data) {
			deptRoutes.push(data.route_id);
		});
		// query for
		query = '{ $and: [ {"route_id": {$nin: deptRoutes } }, { "stop_id": {$in: destIds } } ] }';
		Mapping.find(query, function(err, result) {
			if (err) throw err;
			x.concat(result);
			for (let j = 0; j < x.length; j++) {
				for (let i = 0; i < x.length; i++) {
					if (x[i].stop_id == x[j].stop_id) {
						z.push(x[i].route_id);
					}
				}
			}
			var newz = [...new Set(z)];
			// query for
			query = '{ "id": { $in: newz } }';
			Route.find(query, function(err, result) {
				if (err) throw err;
				var routesnames = [];
				result.forEach(function(data) {
					routesnames.push(data.line);
				});
				let final = [...new Set(routesnames)];
				cb(complete(final));
			});
		});
	});
}

// function to add a new direct route to the database
function addRoute(dept, dest, line, cb) {
	// generate a new route_id
	var newRouteId;
	var newLine;
	Mapping.findOne({ route_id: 10 }).sort('-score').exec(function (err, doc) {
		newRouteId = doc.route_id + 1;
		// see if the stops already exist
		searchDirect(dept, dest, function(result) {
			if (result.length > 0) {
				print("The route already exists!");
				return;
			}
			let new_route = new Route({
				id: newRouteId,
				line: newLine,
				name: dept + " => " + dest
			});
			deptIds.forEach(function(data) {
				let new_mapping = new Mapping({
					"route_id" : newRouteId,
					"stop_id" : data
				});
				new_mapping.save(function (err, new_mapping) {
					if (err) return console.error(err);
				});
			});
		}
		cb(complete("Route between "+dept+" and "+dest+" was created successfully!"));
	});
	}); 
}

// create bounding box and search for stops inside it
function boundingBox(lon1, lat1, lon2, lat2, name, cb) {
	let arr = [lon1,lat1,lon2,lat2,name];
	switch (arr.reduce((a, e, i) => (e === null) ? a.concat(i) : a, [])) {
		case [0,2]:
		query = '{$and:[{"@lat":{$lt:lat1,$gt:lat2}},{"name":{$regex:name}}]}';
		break;
		case [1,3]:
		query = '{$and:[{"@lon":{$gt:lon1,$lt:lon2}},{"name":{$regex:name}}]}';
		break;
		default:
		query = '{$and:[{"@lon":{$gt:lon1,$lt:lon2}},{"@lat":{$lt:lat1,$gt:lat2}},{"name":{$regex:name}}]}';
	}
	Stop.distinct('name', query, function(err, result) {
		if (err) throw err;
		cb(complete(result.join(", ")));
	});
}

// 
function searchRestaurant(stop, dist, cb) {
	var restaurants = [];
	Stop.find('{ "name": stop }', function(err, doc) {
		if (err) throw err;
		var points = [];
		doc.forEach(function(data) {
			points.push([data["@lon"],data["@lat"]]);
		});
		Restaurant.find(function(err, result) {
			if (err) throw err;
			result.forEach(function(data) {
				for (let i = 0; i < points.length; i++) {
					if (distance(points[i][0],points[i][1],data["@lon"],data["@lat"]) <= dist) {
						restaurants.push(data.name);
						break;
					}
				}
			});
			cb(complete(restaurants));
		});
	});
}

// function for callbacks to return stuff
function complete(result) {
	return result;
}

// function to output for the user
function print(content) {
	console.log(content);
}

// function to calculate distance
// between two lon/lats, returns in km
function distance(lon1,lat1,lon2,lat2) {
	var p = 0.017453292519943295;
	var c = Math.cos;
	var a = 0.5 - c((lat2 - lat1) * p)/2 + 
	c(lat1 * p) * c(lat2 * p) * 
	(1 - c((lon2 - lon1) * p))/2;
	return 12742 * Math.asin(Math.sqrt(a));
}