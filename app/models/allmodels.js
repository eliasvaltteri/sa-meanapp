var mongoose = require('mongoose');

var stopSchema = mongoose.model('Stop', {
    '@id': { type: Number },
    '@lon': { type: Number },
    '@lat': { type: Number },
    name: String
});

var routeSchema = mongoose.model('Route', {
    id: { type: Number },
    line: String,
    name: String
});

var mappingSchema = mongoose.model('Mapping', {
    route_id: { type: Number },
    stop_id: { type: Number }
});

var restaurantSchema = mongoose.model('Restaurant', {
    '@id': { type: Number },
    '@lon': { type: Number },
    '@lat': { type: Number },
    name: String,
    website: String
});

module.exports = {
    Stop: Stop,
    Route: Route,
    Mapping: Mapping,
    Restaurant: Restaurant
};
