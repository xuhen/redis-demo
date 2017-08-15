const express = require('express');
const request = require('superagent');
const PORT = process.env.PORT || 3000;

const redis = require('redis');

const redisClient = redis.createClient({host : 'localhost', port : 6379, password: "foodlove"});


redisClient.on('ready',function() {
	console.log("Redis is ready");
});

redisClient.on('error',function() {
	console.log("Error in Redis");
});

const app = express();

function respond(org, numberOfRepos) {
	return `Organization "${org}" has ${numberOfRepos} public repositories.`;
}

function getNumberOfRepos(req, res, next) {
	const org = req.query.org;
	request.get(`https://api.github.com/orgs/${org}/repos`, function (err, response) {
		if (err) throw err;

		var repoNumber = response.body.length;
		redisClient.setex(org, 60, repoNumber);

		res.send(respond(org, repoNumber));
	});
};

function cache(req, res, next) {
	const org = req.query.org;
	redisClient.get(org, function (err, data) {
		if (err) throw err;

		if (data != null) {
			res.send(respond(org, data));
		} else {
			next();
		}
	});
}

app.get('/repos', cache, getNumberOfRepos);

app.listen(PORT, function () {
	console.log('app listening on port', PORT);
});