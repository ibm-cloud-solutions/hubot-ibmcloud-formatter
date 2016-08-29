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

	it('should attempt to uploadfile without message', function() {
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
					room: '12345Channel'
				}
			}
		};

		payload.response.send = sinon.spy();

		slack(robot, payload);
		expect(robot.emit).to.have.not.been.called;
		if (fs.exists(fileName))
			fs.unlinkSync(fileName);
	});

	it('should attempt to uploadfile with message', function() {
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
			message: 'message for file',
			response: {
				message: {
					room: '12345Channel'
				}
			}
		};

		payload.response.send = sinon.spy();

		slack(robot, payload);
		expect(robot.emit).to.have.not.been.called;
		if (fs.exists(fileName))
			fs.unlinkSync(fileName);
	});

	it('should send a slack attachment', function() {
		const payload = {
			response: {
				message: 'Hello'
			},
			attachments: [1, 2, 3]
		};
		payload.response.send = sinon.spy();

		slack(robot, payload);
		expect(payload.response.send).to.have.been.calledWith({ as_user: true, attachments: payload.attachments });
	});

	it('> 50 attachments should send multiple slack attachment messages', function() {
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
		payload.response.send = sinon.spy();
		slack(robot, payload);
		expect(payload.response.send).to.have.been.calledWith({ as_user: true, attachments: firstAttachments });
		expect(payload.response.send).to.have.been.calledWith({ as_user: true, attachments: secondAttachments });
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

	it('should replace escapable characters with unicode equivalents', function() {
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

	it('should not turn numbered lists into html tags', function() {
		let actualOutput = '';
		let testInput = 'Here is my list\n1. One\n2. Two';
		let expectedOutput = testInput;
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

	it('should not turn unordered lists into html tags', function() {
		let actualOutput = '';
		let testInput = 'Here is my list\n- One\n- Two';
		let expectedOutput = testInput;
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
