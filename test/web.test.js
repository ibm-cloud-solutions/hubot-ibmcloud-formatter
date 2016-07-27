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

const formatter = require('../src/lib/web');
const fs = require('fs');

chai.use(sinonChai);

// Passing arrow functions to mocha is discouraged: https://mochajs.org/#arrow-functions
// return promises from mocha tests rather than calling done() - http://tobyho.com/2015/12/16/mocha-with-promises/
describe('Interacting with the Web Transformer', function() {

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

	it('should attempt to uploadfile', function() {
		let fileName = new Date().getTime() + '.txt';
		fs.closeSync(fs.openSync(fileName, 'w'));
		const robot = {};
		robot.adapterName = 'web';
		robot.logger = logger;
		robot.emit = sinon.spy();
		const payload = {
			fileName: fileName,
			filePath: fileName,
			response: {}
		};

		payload.response.send = sinon.spy();

		formatter(robot, payload);
		expect(payload.response.send).to.have.been.calledWith(`<p>Uploading file is not supported for web adapter.</p>\n`);
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
		expect(payload.response.send).to.have.been.calledWith(`<h3 id="app-crash">${payload.attachments[0].title}</h3>\n`);

		payload.attachments[0].text = 'Something bad happened';
		formatter(robot, payload);
		expect(payload.response.send).to.have.been.calledWith(`<h3 id="app-crash">${payload.attachments[0].title}</h3>\n`);

		delete payload.attachments[0].title;
		formatter(robot, payload);
		expect(payload.response.send).to.have.been.calledWith(`<p>${payload.attachments[0].text}</p>\n`);
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
		const expected =
			`<table>\n<thead>\n<tr>\n<th>${payload.attachments[0].fields[0].title}</th>\n</tr>\n</thead>\n<tbody>\n<tr>\n<td></td>\n</tr>\n</tbody>\n</table>\n`;
		expect(payload.response.send).to.have.been.calledWith(expected);
	});

	it('should format attachment fields without the short property', function() {
		const robot = {};
		robot.logger = logger;
		const payload = {
			response: {
				message: 'Hello'
			},
			attachments: [{
				fields: [{
					title: 'CPU'
				}, {
					title: 'Memory'
				}]
			}]
		};
		payload.response.send = sinon.spy();
		formatter(robot, payload);
		const expected =
			`<table>\n<thead>\n<tr>\n<th>${payload.attachments[0].fields[0].title}</th>\n</tr>\n</thead>\n<tbody>\n<tr>\n<td></td>\n</tr>\n</tbody>\n</table>\n<table>\n<thead>\n<tr>\n<th>${payload.attachments[0].fields[1].title}</th>\n</tr>\n</thead>\n<tbody>\n<tr>\n<td></td>\n</tr>\n</tbody>\n</table>\n`;
		expect(payload.response.send).to.have.been.calledWith(expected);
	});

	it('should format attachment fields with the short property', function() {
		const robot = {};
		robot.logger = logger;
		const payload = {
			response: {
				message: 'Hello'
			},
			attachments: [{
				fields: [{
					title: 'CPU',
					short: true
				}, {
					title: 'Memory',
					short: true
				}]
			}]
		};
		payload.response.send = sinon.spy();
		formatter(robot, payload);
		const expected =
			`<table>\n<thead>\n<tr>\n<th>${payload.attachments[0].fields[0].title}</th>\n<th>${payload.attachments[0].fields[1].title}</th>\n</tr>\n</thead>\n<tbody>\n<tr>\n<td></td>\n</tr>\n</tbody>\n</table>\n`;
		expect(payload.response.send).to.have.been.calledWith(expected);
	});

	it('should format attachment fields where only one field is short', function() {
		const robot = {};
		robot.logger = logger;
		const payload = {
			response: {
				message: 'Hello'
			},
			attachments: [{
				fields: [{
					title: 'CPU'
				}, {
					title: 'Memory',
					short: true
				}]
			}]
		};
		payload.response.send = sinon.spy();
		formatter(robot, payload);
		const expected =
			`<table>\n<thead>\n<tr>\n<th>${payload.attachments[0].fields[0].title}</th>\n</tr>\n</thead>\n<tbody>\n<tr>\n<td></td>\n</tr>\n</tbody>\n</table>\n<table>\n<thead>\n<tr>\n<th>${payload.attachments[0].fields[1].title}</th>\n</tr>\n</thead>\n<tbody>\n<tr>\n<td></td>\n</tr>\n</tbody>\n</table>\n`;
		expect(payload.response.send).to.have.been.calledWith(expected);
	});

	it('should format attachment fields where there is text before the table', function() {
		const robot = {};
		robot.logger = logger;
		const payload = {
			response: {
				message: 'Hello'
			},
			attachments: [{
				pretext: 'App details',
				fields: [{
					title: 'CPU'
				}, {
					title: 'Memory',
					short: true
				}]
			}]
		};
		payload.response.send = sinon.spy();
		formatter(robot, payload);
		const expected =
			`<p>App details</p>\n<table>\n<thead>\n<tr>\n<th>${payload.attachments[0].fields[0].title}</th>\n</tr>\n</thead>\n<tbody>\n<tr>\n<td></td>\n</tr>\n</tbody>\n</table>\n<table>\n<thead>\n<tr>\n<th>${payload.attachments[0].fields[1].title}</th>\n</tr>\n</thead>\n<tbody>\n<tr>\n<td></td>\n</tr>\n</tbody>\n</table>\n`;
		expect(payload.response.send).to.have.been.calledWith(expected);
	});

	it('should format attachment images', function() {
		const robot = {};
		robot.logger = logger;
		const payload = {
			response: {
				message: 'Hello'
			},
			attachments: [{
				image_url: 'https://i.imgur.com/image.png'
			}]
		};
		payload.response.send = sinon.spy();
		formatter(robot, payload);
		const expected = `<p><img src="${payload.attachments[0].image_url}" alt="Image"></p>\n`;
		expect(payload.response.send).to.have.been.calledWith(expected);
	});

	it('should repalce escapable characters with unicode equivalents', function() {
		let testInput = '"It\'s about time."';
		let expected = '<p>\u201cIt\u2019s about time.\u201d</p>\n';

		const robot = {};
		robot.logger = logger;
		const payload = {
			response: {
				message: 'Hello'
			},
			message: testInput
		};

		payload.response.send = sinon.spy();
		formatter(robot, payload);
		expect(payload.response.send).to.have.been.calledWith(expected);
	});
});
