// Description:
//	Accepts events to format attachment data for the active adapter
//
// Author:
//	nsandona
//
/*
 * Licensed Materials - Property of IBM
 * (C) Copyright IBM Corp. 2016. All Rights Reserved.
 * US Government Users Restricted Rights - Use, duplication or
 * disclosure restricted by GSA ADP Schedule Contract with IBM Corp.
 */
'use strict';

var path = require('path');
var TAG = path.basename(__filename);

const ADAPTERS = {
	slack: require('../lib/slack'),
	fb: require('../lib/facebook'),
	textFormatter: require('../lib/textFormatter'),
	web: require('../lib/web')
};

module.exports = robot => {
	robot.on('ibmcloud.formatter', attachment => {
		const adapter = ADAPTERS[robot.adapterName && robot.adapterName.toLowerCase()];
		robot.logger.debug(`${TAG}: Robot is using adapter ${robot.adapterName}.`);
		if (adapter) {
			adapter(robot, attachment);
		}
		else {
			robot.logger.debug(`${TAG}: Falling back to text formatter.`);
			ADAPTERS.textFormatter(robot, attachment);
		}
	});

	// Remove the need to address hubot during conversation on facebook messenger
	// since it currently does NOT support bots in group messages
	robot.receiveMiddleware(function(context, next, done) {
		const adapter = robot.adapterName && robot.adapterName.toLowerCase();
		if (adapter === 'fb' || adapter === 'web') {
			context.response.message.text = `${robot.name} ${context.response.message.text}`;
		}
		return next(done);
	});
};
