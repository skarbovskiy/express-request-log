'use strict';

module.exports = function createMiddleware (logger, options) {
	options = options || {};
	options.headers = !!(options.headers || false);
	options.request = !!(options.request || false);
	options.response = !!(options.response || false);
	if (!logger || !logger.info) {
		throw new Error('compatable logger not provided');
	}

	return function loggingMiddleware (req, res, next) {
		var end = res.end;
		var startTime = Date.now();
		res.end = function proxyEnd (body) {
			var endTime = Date.now();
			var args = Array.prototype.slice.apply(arguments);
			end.apply(res, args);

			var logEntry = {
				requestIps: req.ips.concat([req.ip]),
				requestPath: req.originalUrl,
				requestMethod: req.method,
				responseStatus: res.statusCode,
				responseDuration: endTime - startTime
			};
			if (options.headers) {
				logEntry.requestHeaders = JSON.stringify(req.headers);
			}
			if (options.request) {
				logEntry.requestBody = typeof(req.body) === 'object' ? JSON.stringify(req.body) : req.body;
			}
			if (options.response) {
				logEntry.responseBody = body ? body.toString() : null;
			}
			logger.info('request', logEntry);
		}
		next();
	}
};
