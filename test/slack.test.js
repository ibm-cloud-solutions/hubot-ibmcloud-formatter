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

const slack = require('../src/lib/slack');
const fs = require('fs');
const nock = require('nock');

chai.use(sinonChai);

// Passing arrow functions to mocha is discouraged: https://mochajs.org/#arrow-functions
// return promises from mocha tests rather than calling done() - http://tobyho.com/2015/12/16/mocha-with-promises/
describe('Interacting with the Slack Transformer', function() {

	let logger = {
		debug: function() {},
		info: function() {},
		warn: function() {},
		error: function() {}
	};
	let robot = {
		logger: logger
	};

	it('should attempt to uploadfile', function() {
		nock('https://slack.com/api').post('/files.upload').reply(200, {});
		let fileName = new Date().getTime() + '.txt';
		fs.closeSync(fs.openSync(fileName, 'w'));
		const robot = {};
		robot.adapterName = 'slack';
		robot.adapter = {
			options: {
				token: '1234'
			}
		};
		robot.logger = logger;
		robot.emit = sinon.spy();
		const payload = {
			fileName: fileName,
			filePath: fileName,
			response: {
				message: {
					rawMessage: {
						channel: '12345Channel'
					}
				}
			}
		};

		payload.response.send = sinon.spy();

		slack(robot, payload);
		expect(robot.emit).to.have.not.been.called;
		if (fs.exists(fileName))
			fs.unlinkSync(fileName);
	});

	it('should emit a slack.attachment event', function() {
		robot.emit = sinon.spy();
		const payload = {
			response: {
				message: 'Hello'
			},
			attachments: [1, 2, 3]
		};

		slack(robot, payload);
		expect(robot.emit).to.have.been.calledWith('slack.attachment', {
			message: payload.response.message,
			attachments: payload.attachments
		});
	});

	it('> 50 attachments should emit a multiple slack.attachment events', function() {
		robot.emit = sinon.spy();
		let longAttachments = [];
		let firstAttachments = [];
		let secondAttachments = [];
		for (var i = 0; i < 51; i++) {
			longAttachments.push(i);
			if (i < 50) {
				firstAttachments.push(i);
			}
			else {
				secondAttachments.push(i);
			}
		}
		const payload = {
			response: {
				message: 'Hello'
			},
			attachments: longAttachments
		};

		slack(robot, payload);
		expect(robot.emit).to.have.been.calledWith('slack.attachment', {
			message: payload.response.message,
			attachments: firstAttachments
		});
		expect(robot.emit).to.have.been.calledWith('slack.attachment', {
			message: payload.response.message,
			attachments: secondAttachments
		});
	});

	it('should reply with a properly formatted response', function() {
		let actualOutput = '';
		let testInput = '<a href="http://github.com/project">link_text</a>, **strong**, *highlight*, \n>blockquote';
		let expectedOutput = 'http://github.com/project, *strong*, `highlight`, ```blockquote```';
		let replyFunc = function(arg) {
			actualOutput = arg;
		};
		const payload = {
			message: testInput,
			response: {
				reply: replyFunc
			}
		};

		slack(robot, payload);
		expect(actualOutput).to.eql(expectedOutput);
	});

	it('should repalce escapable characters with unicode equivalents', function() {
		let actualOutput = '';
		let testInput = '"It\'s about time."';
		let expectedOutput = '\u201cIt\u2019s about time.\u201d';
		let replyFunc = function(arg) {
			actualOutput = arg;
		};
		const payload = {
			message: testInput,
			response: {
				reply: replyFunc
			}
		};

		slack(robot, payload);
		expect(actualOutput).to.eql(expectedOutput);
	});
});
