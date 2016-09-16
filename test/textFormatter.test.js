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

const formatter = require('../src/lib/textFormatter');
const fs = require('fs');

chai.use(sinonChai);

// Passing arrow functions to mocha is discouraged: https://mochajs.org/#arrow-functions
// return promises from mocha tests rather than calling done() - http://tobyho.com/2015/12/16/mocha-with-promises/
describe('Interacting with the Plain Text Transformer', function() {

	let logger = {
		debug: function() {},
		info: function() {},
		warn: function() {},
		error: function() {}
	};

	it('should not emit an event', function() {
		const robot = {};
		robot.logger = logger;
		robot.emit = sinon.spy();
		const payload = {
			response: {
				message: 'Hello',
				send() {}
			},
			attachments: [{}]
		};

		formatter(robot, payload);
		expect(robot.emit).to.have.not.been.called;
	});

	it('should attempt to uploadfile without message', function() {
		let fileName = new Date().getTime() + '.txt';
		fs.closeSync(fs.openSync(fileName, 'w'));
		const robot = {};
		robot.adapterName = 'shell';
		robot.logger = logger;
		robot.emit = sinon.spy();
		const payload = {
			fileName: fileName,
			filePath: fileName,
			response: {
				send() {}
			}
		};

		let pathToFile = fs.realpathSync(fileName);
		payload.response.send = sinon.spy();

		formatter(robot, payload);
		expect(payload.response.send).to.have.been.calledWith(`File downloaded and available ${pathToFile}`);
		if (fs.exists(fileName))
			fs.unlinkSync(fileName);
	});

	it('should attempt to uploadfile with message', function() {
		let fileName = new Date().getTime() + '.txt';
		fs.closeSync(fs.openSync(fileName, 'w'));
		const robot = {};
		robot.adapterName = 'shell';
		robot.logger = logger;
		robot.emit = sinon.spy();
		const payload = {
			fileName: fileName,
			filePath: fileName,
			message: 'message for file',
			response: {
				send() {}
			}
		};

		let pathToFile = fs.realpathSync(fileName);
		payload.response.send = sinon.spy();

		formatter(robot, payload);
		expect(payload.response.send).to.have.been.calledWith(`message for file\nFile downloaded and available ${pathToFile}`);
		if (fs.exists(fileName))
			fs.unlinkSync(fileName);
	});

	it('should attempt to uploadfile with message and initial_comment', function() {
		let fileName = new Date().getTime() + '.txt';
		fs.closeSync(fs.openSync(fileName, 'w'));
		const robot = {};
		robot.adapterName = 'shell';
		robot.logger = logger;
		robot.emit = sinon.spy();
		const payload = {
			fileName: fileName,
			filePath: fileName,
			message: 'message for file',
			initial_comment: 'nice file',
			response: {
				send() {}
			}
		};

		let pathToFile = fs.realpathSync(fileName);
		payload.response.send = sinon.spy();

		formatter(robot, payload);
		expect(payload.response.send).to.have.been.calledWith(`message for file\nFile downloaded and available ${pathToFile}\nnice file\n`);
		if (fs.exists(fileName))
			fs.unlinkSync(fileName);
	});

	it('should format attachment titles and text', function() {
		const robot = {};
		robot.logger = logger;
		const payload = {
			response: {
				message: 'Hello'
			},
			attachments: [{
				title: 'App Crash'
			}]
		};
		payload.response.send = sinon.spy();

		formatter(robot, payload);
		expect(payload.response.send).to.have.been.calledWith(`${payload.attachments[0].title}\n\n`);

		payload.attachments[0].text = 'Something bad happened';
		formatter(robot, payload);
		expect(payload.response.send).to.have.been.calledWith(
			`${payload.attachments[0].title}: ${payload.attachments[0].text}\n\n`);

		delete payload.attachments[0].title;
		formatter(robot, payload);
		expect(payload.response.send).to.have.been.calledWith(`${payload.attachments[0].text}\n\n`);
	});

	it('should format attachment fields', function() {
		const robot = {};
		robot.logger = logger;
		const payload = {
			response: {
				message: 'Hello'
			},
			attachments: [{
				fields: [{
					title: 'CPU'
				}]
			}]
		};
		payload.response.send = sinon.spy();

		formatter(robot, payload);
		expect(payload.response.send).to.have.been.calledWith(`${payload.attachments[0].fields[0].title}   \n\n`);

		payload.attachments[0].fields[0].value = '80%';
		formatter(robot, payload);
		expect(payload.response.send).to.have.been.calledWith(
			`${payload.attachments[0].fields[0].title}   ${payload.attachments[0].fields[0].value}\n\n`);

		delete payload.attachments[0].fields[0].title;
		formatter(robot, payload);
		expect(payload.response.send).to.have.been.calledWith(`   ${payload.attachments[0].fields[0].value}\n\n`);
	});

	it('should reply with a properly formatted response', function() {
		const robot = {};
		robot.logger = logger;
		let actualOutput = '';
		let testInput = '**strong**, *highlight*, \n>blockquote';
		let expectedOutput = '\'strong\', \'highlight\', \nblockquote';
		let sendFunc = function(arg) {
			actualOutput = arg;
		};
		const payload = {
			message: testInput,
			response: {
				send: sendFunc
			}
		};

		formatter(robot, payload);
		expect(actualOutput).to.eql(expectedOutput);
	});

	it('should repalce escapable characters with unicode equivalents', function() {
		const robot = {};
		robot.logger = logger;
		let actualOutput = '';
		let testInput = '"It\'s about time."';
		let expectedOutput = '\u201cIt\u2019s about time.\u201d';
		let sendFunc = function(arg) {
			actualOutput = arg;
		};
		const payload = {
			message: testInput,
			response: {
				send: sendFunc
			}
		};

		formatter(robot, payload);
		expect(actualOutput).to.eql(expectedOutput);
	});


	it('should not turn numbered lists into html tags', function() {
		const robot = {};
		robot.logger = logger;
		let actualOutput = '';
		let testInput = 'Here is my list\n1. One\n2. Two';
		let expectedOutput = testInput;
		let sendFunc = function(arg) {
			actualOutput = arg;
		};
		const payload = {
			message: testInput,
			response: {
				send: sendFunc
			}
		};

		formatter(robot, payload);
		expect(actualOutput).to.eql(expectedOutput);
	});

	it('should not turn unordered lists into html tags', function() {
		const robot = {};
		robot.logger = logger;
		let actualOutput = '';
		let testInput = 'Here is my list\n- One\n- Two';
		let expectedOutput = testInput;
		let sendFunc = function(arg) {
			actualOutput = arg;
		};
		const payload = {
			message: testInput,
			response: {
				send: sendFunc
			}
		};

		formatter(robot, payload);
		expect(actualOutput).to.eql(expectedOutput);
	});
});
