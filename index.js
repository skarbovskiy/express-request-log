'use strict';
const get = require('lodash.get');

module.exports = function createMiddleware (logger, options) {
	options = options || {};
	options.headers = !!(options.headers || false);
	options.request = !!(options.request || false);
	options.response = !!(options.response || false);
	options.maxBodyLength = (options.maxBodyLength || null);
	options.mixins = options.mixins || [];
	if (!logger || !logger.info) {
		throw new Error('compatable logger not provided');
	}

	return function loggingMiddleware (req, res, next) {
		var end = res.end;
		var json = res.json;
		var startTime = Date.now();
		res.json = function (bodyJson) {
			res._bodyJson = bodyJson;
			json.apply(res, arguments);
		};
		res.end = function proxyEnd () {
			var endTime = Date.now();
			end.apply(res, arguments);

			var logEntry = {
				requestTime: (new Date(startTime)).toISOString(),
				requestIps: JSON.stringify(req.ips.concat([req.ip])),
				requestHostname: req.hostname,
				requestPath: req.originalUrl,
				requestMethod: req.method,
				responseStatus: res.statusCode,
				responseDuration: endTime - startTime
			};

			if (options.mixins && options.mixins.length) {
				var additionalData = {};
				options.mixins.forEach(function (mixin) {
					additionalData[mixin] = get(req, mixin);
				});
				logEntry.additionalData = JSON.stringify(additionalData);
			}

			if (options.headers) {
				logEntry.requestHeaders = JSON.stringify(req.headers);
			}

			if (options.request) {
				logEntry.requestBody = JSON.stringify(req.body);
				if (options.maxBodyLength && logEntry.requestBody.length > options.maxBodyLength) {
					logEntry.requestBody = logEntry.requestBody.substring(0, options.maxBodyLength) + '...';
				}
			}

			if (options.response && res._bodyJson) {
				logEntry.responseBody = JSON.stringify(res._bodyJson);
				if (options.maxBodyLength && logEntry.responseBody.length > options.maxBodyLength) {
					logEntry.responseBody = logEntry.responseBody.substring(0, options.maxBodyLength) + '...';
				}
			}

			logger.info('request', logEntry);
		}
		next();
	}
};
