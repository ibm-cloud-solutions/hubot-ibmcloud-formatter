/*
 * Licensed Materials - Property of IBM
 * (C) Copyright IBM Corp. 2016. All Rights Reserved.
 * US Government Users Restricted Rights - Use, duplication or
 * disclosure restricted by GSA ADP Schedule Contract with IBM Corp.
 */
'use strict';

const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const expect = chai.expect;
const listener = require('../src/scripts/listener');

chai.use(sinonChai);

// Passing arrow functions to mocha is discouraged: https://mochajs.org/#arrow-functions
// return promises from mocha tests rather than calling done() - http://tobyho.com/2015/12/16/mocha-with-promises/
describe('Interacting with the IBM Cloud Formatter', function() {

	let logger = {
		debug: function() {},
		info: function() {},
		warn: function() {},
		error: function() {}
	};

	context('Registering the listener', function() {
		const robot = {};
		robot.logger = logger;
		robot.on = sinon.spy();
		robot.receiveMiddleware = sinon.spy();

		it('should add a callback for the ibmcloud.formatter event', function() {
			listener(robot);
			expect(robot.on).to.have.been.calledWith('ibmcloud.formatter');
		});
	});

	context('Picking the proper formatter', function() {

		it('should use the Slack formatter when the slack adapter is used', function() {
			let eventCb;
			const robot = {
				adapterName: 'slack',
				on(name, cb) {
					eventCb = cb;
				}
			};
			robot.logger = logger;
			robot.emit = sinon.spy();
			robot.receiveMiddleware = sinon.spy();

			let data = {
				response: {
					message: '1'
				},
				attachments: []
			};
			listener(robot);
			expect(eventCb).to.be.defined;
			eventCb(data);
			expect(robot.emit).to.have.been.calledWith('slack.attachment');
		});

		it('should use the text formatter when an unkown adapter type is used', function() {
			let eventCb;
			const robot = {
				adapterName: 'super-rare-unknown-nonexistent',
				on(name, cb) {
					eventCb = cb;
				}
			};
			robot.logger = logger;
			robot.emit = sinon.spy();
			robot.receiveMiddleware = sinon.spy();

			const payload = {
				response: {},
				attachment: {}
			};
			payload.response.send = sinon.spy();

			listener(robot);
			expect(eventCb).to.be.defined;
			eventCb(payload);
			expect(robot.emit).to.have.not.been.calledWith('slack.attachment');
			expect(payload.response.send).to.have.been.calledWith('No results found');
		});

		it('should prepend robot\'s name to message when using fb adapter', function() {
			let middlewareCb;
			const robot = {
				adapterName: 'fb',
				name: 'fbbot',
				receiveMiddleware(cb) {
					middlewareCb = cb;
				}
			};
			robot.logger = logger;
			robot.emit = sinon.spy();
			robot.on = sinon.spy();

			const oldText = 'hello there';
			const context = {
				response: {
					message: {
						text: oldText
					}
				}
			};

			listener(robot);
			expect(middlewareCb).to.be.defined;
			middlewareCb(context, sinon.spy(), sinon.spy());
			expect(context.response.message.text).to.eql(`${robot.name} ${oldText}`);
		});

		it('should not prepend robot\'s name to message when using non-fb adapter', function() {
			let middlewareCb;
			const robot = {
				adapterName: 'slack',
				name: 'slackbot',
				receiveMiddleware(cb) {
					middlewareCb = cb;
				}
			};
			robot.logger = logger;
			robot.emit = sinon.spy();
			robot.on = sinon.spy();

			const oldText = 'hello there';
			const context = {
				response: {
					message: {
						text: oldText
					}
				}
			};

			listener(robot);
			expect(middlewareCb).to.be.defined;
			middlewareCb(context, sinon.spy(), sinon.spy());
			expect(context.response.message.text).to.eql(`${oldText}`);
		});
	});
});
