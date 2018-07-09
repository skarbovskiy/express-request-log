'use strict';
const get = require('lodash.get');
const uuid = require('uuid/v4');

module.exports = function createMiddleware (logger, options) {
	options = options || {};
	options.headers = !!(options.headers || false);
	options.request = !!(options.request || false);
	options.response = !!(options.response || false);
	options.mixins = options.mixins || [];
	if (!logger || !logger.info) {
		throw new Error('compatable logger not provided');
	}

	return function loggingMiddleware (req, res, next) {
		var end = res.end;
		var startTime = Date.now();
		req.uuid = uuid();
		res.end = function proxyEnd (body) {
			var endTime = Date.now();
			var args = Array.prototype.slice.apply(arguments);
			end.apply(res, args);

			var logEntry = {
				time: (new Date(startTime)).toISOString(),
				uuid: req.uuid,
				requestIps: req.ips.concat([req.ip]),
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
			}

			logger.info('request', logEntry);
		}
		next();
	}
};
