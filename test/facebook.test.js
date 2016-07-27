/*
 * Licensed Materials - Property of IBM
 * (C) Copyright IBM Corp. 2016. All Rights Reserved.
 * US Government Users Restricted Rights - Use, duplication or
 * disclosure restricted by GSA ADP Schedule Contract with IBM Corp.
 */
'use strict';

const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
const sinonChai = require('sinon-chai');

const fb = require('../src/lib/facebook');
const fs = require('fs');

chai.use(sinonChai);

// Passing arrow functions to mocha is discouraged: https://mochajs.org/#arrow-functions
// return promises from mocha tests rather than calling done() - http://tobyho.com/2015/12/16/mocha-with-promises/
describe('Interacting with the Facebook Transformer', function() {
	let logger = {
		debug: function() {},
		info: function() {},
		warn: function() {},
		error: function() {}
	};
	let robot = {
		logger: logger
	};

	beforeEach(function() {
		robot.emit = sinon.spy();
	});

	it('should attempt to uploadfile', function() {
		let fileName = new Date().getTime() + '.txt';
		fs.closeSync(fs.openSync(fileName, 'w'));
		const robot = {};
		robot.adapterName = 'fb';
		robot.logger = logger;
		robot.emit = sinon.spy();
		const payload = {
			fileName: fileName,
			filePath: fileName,
			response: {
				message: 'Hello',
				envelope: {},
				send() {}
			},
			attachments: []
		};

		fb(robot, payload);
		expect(robot.emit).to.have.been.calledWith('fb.message');
		if (fs.exists(fileName))
			fs.unlinkSync(fileName);
	});

	it('should update the response envelope', function() {
		const payload = {
			response: {
				message: 'Hello',
				envelope: {},
				send() {}
			},
			attachments: [{
				title: 'First',
				pretext: 'First Pretext',
				text: 'First Description',
				fields: [{
					title: 'Field1',
					value: 'Field1-value'
				}]
			}]
		};

		fb(robot, payload);
		expect(robot.emit).to.have.been.calledWith('fb.message');

		const message = robot.emit.args[0][1];
		expect(message).to.have.deep.property('message.attachment.type', 'template');
		const attachment = message.message.attachment;
		expect(attachment).to.have.deep.property('payload.template_type', 'generic');
		expect(attachment).to.have.deep.property('payload.elements').to.be.length(1);
		expect(attachment).to.have.deep.property('payload.elements[0].title').to.equal(payload.attachments[0].title);
		expect(attachment).to.have.deep.property('payload.elements[0].subtitle').to.equal(
			`${payload.attachments[0].pretext} ${payload.attachments[0].text}, ${payload.attachments[0].fields[0].title}: ${payload.attachments[0].fields[0].value}`
		);
	});

	it('should reply with a properly formatted response', function() {
		let testInput = '**strong**, *highlight*, \n>blockquote';
		let expectedOutput = '\'strong\', \'highlight\', \nblockquote';
		let sendFunc = function(arg) {};
		const payload = {
			message: testInput,
			response: {
				envelope: {},
				send: sendFunc
			}
		};

		fb(robot, payload);
		expect(robot.emit).to.have.been.calledWith('fb.message');

		const resp = robot.emit.args[0][1];
		expect(resp).to.exist;
		expect(resp).to.have.deep.property('message.text', expectedOutput);
	});

	it('long request should reply with several payloads', function() {
		let hundredChars =
			'0123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789';
		let testInput = hundredChars + hundredChars + hundredChars + 'abc';
		// let expectedOutput1 = hundredChars + hundredChars + hundredChars;
		let expectedOutput2 = 'abc';
		let sendFunc = function(arg) {};
		const payload = {
			message: testInput,
			response: {
				envelope: {},
				send: sendFunc
			}
		};

		fb(robot, payload);
		expect(robot.emit).to.have.been.calledWith('fb.message');
		expect(robot.emit).to.have.been.calledTwice;
		expect(robot.emit.args[0][1]).to.have.deep.property('message.text', hundredChars + hundredChars + hundredChars);
		expect(robot.emit.args[1][1]).to.have.deep.property('message.text', expectedOutput2);
	});

	it('should handle an empty payload', function() {
		const payload = {
			response: {
				message: 'Hello',
				envelope: {},
				send() {}
			},
			attachments: []
		};

		fb(robot, payload);
		expect(robot.emit).to.have.been.calledWith('fb.message');
		expect(robot.emit).to.have.been.calledOnce;
		const message = robot.emit.args[0][1];
		expect(message).to.have.deep.property('message.attachment.type', 'template');
		const attachment = message.message.attachment;
		expect(attachment).to.have.deep.property('payload.template_type', 'generic');
		expect(attachment).to.have.deep.property('payload.elements').to.be.length(0);
	});

	it('should handle only field payload', function() {
		const payload = {
			response: {
				message: 'Hello',
				envelope: {},
				send() {}
			},
			attachments: [{
				fields: [{
					title: 'Field1',
					value: 'Field1-value'
				}]
			}]
		};

		fb(robot, payload);
		expect(robot.emit).to.have.been.calledWith('fb.message');
		expect(robot.emit).to.have.been.calledOnce;
		const message = robot.emit.args[0][1];
		expect(message).to.have.deep.property('message.attachment.type', 'template');
		const attachment = message.message.attachment;
		expect(attachment).to.have.deep.property('payload.template_type', 'generic');
		expect(attachment).to.have.deep.property('payload.elements').to.be.length(1);
		expect(attachment).to.have.deep.property('payload.elements[0].subtitle').to.equal(
			`${payload.attachments[0].fields[0].title}: ${payload.attachments[0].fields[0].value}`);
	});

	it('should handle no fields', function() {
		const payload = {
			response: {
				message: 'Hello',
				envelope: {},
				send() {}
			},
			attachments: [{
				title: 'Cool Stuff',
				text: 'Nifty'
			}]
		};

		fb(robot, payload);
		expect(robot.emit).to.have.been.calledWith('fb.message');
		expect(robot.emit).to.have.been.calledOnce;
		const message = robot.emit.args[0][1];
		expect(message).to.have.deep.property('message.attachment.type', 'template');
		const attachment = message.message.attachment;
		expect(attachment).to.have.deep.property('payload.template_type', 'generic');
		expect(attachment).to.have.deep.property('payload.elements').to.be.length(1);
		expect(attachment).to.have.deep.property('payload.elements[0].title').to.equal(payload.attachments[0].title);
		expect(attachment).to.have.deep.property('payload.elements[0].subtitle').to.equal(payload.attachments[0].text);
	});

	it('should handle no title but yes text', function() {
		const payload = {
			response: {
				message: 'Hello',
				envelope: {},
				send() {}
			},
			attachments: [{
				text: 'Nifty'
			}]
		};

		fb(robot, payload);
		expect(robot.emit).to.have.been.calledWith('fb.message');
		expect(robot.emit).to.have.been.calledOnce;
		const message = robot.emit.args[0][1];
		expect(message).to.have.deep.property('message.attachment.type', 'template');
		const attachment = message.message.attachment;
		expect(attachment).to.have.deep.property('payload.template_type', 'generic');
		expect(attachment).to.have.deep.property('payload.elements').to.be.length(1);
		expect(attachment).to.have.deep.property('payload.elements[0].title').to.equal(payload.attachments[0].text);
		expect(attachment).to.have.deep.property('payload.elements[0].subtitle').to.equal(payload.attachments[0].text);
	});

	it('should handle title with more than 80 characters', function() {
		const payload = {
			response: {
				message: 'Hello',
				envelope: {},
				send() {}
			},
			attachments: [{
				title: 'zk3iB74NnAio9vvZERzJelkGjQ4un9fUkFo6PUHOFxW7cnf8fc0rYAf72ez5UF7J4F3SFwcAQLIrAWeJj',
				text: 'Nifty'
			}]
		};

		fb(robot, payload);
		expect(robot.emit).to.have.been.calledWith('fb.message');
		expect(robot.emit).to.have.been.calledOnce;
		const message = robot.emit.args[0][1];
		expect(message).to.have.deep.property('message.attachment.type', 'template');
		const attachment = message.message.attachment;
		expect(attachment).to.have.deep.property('payload.template_type', 'generic');
		expect(attachment).to.have.deep.property('payload.elements').to.be.length(1);
		expect(attachment).to.have.deep.property('payload.elements[0].title').to.equal(payload.attachments[0].title.substring(
			0, 75) + '...');
		expect(attachment).to.have.deep.property('payload.elements[0].subtitle').to.equal(payload.attachments[0].text);
	});

	it('should promote field values in the absence of titles', function() {
		const payload = {
			response: {
				message: 'Hello',
				envelope: {},
				send() {}
			},
			attachments: [{
				fields: [{
					title: '',
					value: 'A titleless field'
				}]
			}]
		};

		fb(robot, payload);
		expect(robot.emit).to.have.been.calledWith('fb.message');
		expect(robot.emit).to.have.been.calledOnce;
		const message = robot.emit.args[0][1];
		expect(message).to.have.deep.property('message.attachment.type', 'template');
		const attachment = message.message.attachment;
		expect(attachment).to.have.deep.property('payload.template_type', 'generic');
		expect(attachment).to.have.deep.property('payload.elements').to.be.length(1);
		expect(attachment).to.have.deep.property('payload.elements[0].title').to.equal(payload.attachments[0].fields[0].value);
	});

	it('should be an emptry string when there are fields with only empty title/value', function() {
		const payload = {
			response: {
				message: 'Hello',
				envelope: {},
				send() {}
			},
			attachments: [{
				fields: [{
					title: '',
					value: ''
				}]
			}]
		};

		fb(robot, payload);
		expect(robot.emit).to.have.been.calledWith('fb.message');
		expect(robot.emit).to.have.been.calledOnce;
		const message = robot.emit.args[0][1];
		expect(message).to.have.deep.property('message.attachment.type', 'template');
		const attachment = message.message.attachment;
		expect(attachment).to.have.deep.property('payload.template_type', 'generic');
		expect(attachment).to.have.deep.property('payload.elements').to.be.length(1);
		expect(attachment).to.have.deep.property('payload.elements[0].title').to.be.empty;
	});

	it('should handle the absence of title, text, and fields', function() {
		const payload = {
			response: {
				message: 'Hello',
				envelope: {},
				send() {}
			},
			attachments: [{}]
		};

		fb(robot, payload);
		expect(robot.emit).to.have.been.calledWith('fb.message');
		expect(robot.emit).to.have.been.calledOnce;
		const message = robot.emit.args[0][1];
		expect(message).to.have.deep.property('message.attachment.type', 'template');
		const attachment = message.message.attachment;
		expect(attachment).to.have.deep.property('payload.template_type', 'generic');
		expect(attachment).to.have.deep.property('payload.elements').to.be.length(1);
		expect(attachment).to.have.deep.property('payload.elements[0].title').to.be.empty;
	});

	it('should handle image_url', function() {
		const payload = {
			response: {
				message: 'Hello',
				envelope: {},
				send() {}
			},
			attachments: [{
				title: 'First',
				text: 'Nifty',
				image_url: 'https://goo.gl/o1sWMI'
			}]
		};

		fb(robot, payload);
		expect(robot.emit).to.have.been.calledWith('fb.message');
		expect(robot.emit).to.have.been.calledOnce;
		const message = robot.emit.args[0][1];
		expect(message).to.have.deep.property('message.attachment.type', 'template');
		const attachment = message.message.attachment;
		expect(attachment).to.have.deep.property('payload.template_type', 'generic');
		expect(attachment).to.have.deep.property('payload.elements').to.be.length(1);
		expect(attachment).to.have.deep.property('payload.elements[0].image_url').to.equal(payload.attachments[0].image_url);
	});

	it('should handle thumb_url', function() {
		const payload = {
			response: {
				message: 'Hello',
				envelope: {},
				send() {}
			},
			attachments: [{
				title: 'First',
				text: 'Nifty',
				thumb_url: 'https://goo.gl/o1sWMI'
			}]
		};

		fb(robot, payload);
		expect(robot.emit).to.have.been.calledWith('fb.message');
		expect(robot.emit).to.have.been.calledOnce;
		const message = robot.emit.args[0][1];
		expect(message).to.have.deep.property('message.attachment.type', 'template');
		const attachment = message.message.attachment;
		expect(attachment).to.have.deep.property('payload.template_type', 'generic');
		expect(attachment).to.have.deep.property('payload.elements').to.be.length(1);
		expect(attachment).to.have.deep.property('payload.elements[0].image_url').to.equal(payload.attachments[0].thumb_url);
	});

	it('should handle author_icon', function() {
		const payload = {
			response: {
				message: 'Hello',
				envelope: {},
				send() {}
			},
			attachments: [{
				title: 'First',
				text: 'Nifty',
				author_icon: 'https://goo.gl/o1sWMI'
			}]
		};

		fb(robot, payload);
		expect(robot.emit).to.have.been.calledWith('fb.message');
		expect(robot.emit).to.have.been.calledOnce;
		const message = robot.emit.args[0][1];
		expect(message).to.have.deep.property('message.attachment.type', 'template');
		const attachment = message.message.attachment;
		expect(attachment).to.have.deep.property('payload.template_type', 'generic');
		expect(attachment).to.have.deep.property('payload.elements').to.be.length(1);
		expect(attachment).to.have.deep.property('payload.elements[0].image_url').to.equal(payload.attachments[0].author_icon);
	});

	it('should handle footer_icon', function() {
		const payload = {
			response: {
				message: 'Hello',
				envelope: {},
				send() {}
			},
			attachments: [{
				title: 'First',
				text: 'Nifty',
				footer_icon: 'https://goo.gl/o1sWMI'
			}]
		};

		fb(robot, payload);
		expect(robot.emit).to.have.been.calledWith('fb.message');
		expect(robot.emit).to.have.been.calledOnce;
		const message = robot.emit.args[0][1];
		expect(message).to.have.deep.property('message.attachment.type', 'template');
		const attachment = message.message.attachment;
		expect(attachment).to.have.deep.property('payload.template_type', 'generic');
		expect(attachment).to.have.deep.property('payload.elements').to.be.length(1);
		expect(attachment).to.have.deep.property('payload.elements[0].image_url').to.equal(payload.attachments[0].footer_icon);
	});

	it('should handle fallback', function() {
		const payload = {
			response: {
				message: 'Hello',
				envelope: {},
				send() {}
			},
			attachments: [{
				fallback: 'First Fallback'
			}]
		};

		fb(robot, payload);
		expect(robot.emit).to.have.been.calledWith('fb.message');
		expect(robot.emit).to.have.been.calledOnce;
		const message = robot.emit.args[0][1];
		expect(message).to.have.deep.property('message.attachment.type', 'template');
		const attachment = message.message.attachment;
		expect(attachment).to.have.deep.property('payload.template_type', 'generic');
		expect(attachment).to.have.deep.property('payload.elements').to.be.length(1);
		expect(attachment).to.have.deep.property('payload.elements[0].subtitle').to.equal(
			`${payload.attachments[0].fallback}`);
	});

	it('should extract a content url', function() {
		const payload = {
			response: {
				message: 'Hello',
				envelope: {},
				send() {}
			},
			attachments: [{
				fields: [{
					title: 'url',
					value: 'https://goo.gl/o1sWMI'
				}]
			}]
		};

		// Post and verify payload with single url field works as expected.
		fb(robot, payload);

		payload.attachments[0].fields[0].title = 'urls';
		payload.attachments[0].fields[0].value = 'https:/goo.gl/o1sWMI, https://final/image.png';

		// Post and verify payload with multiple urls works as expected.
		fb(robot, payload);

		payload.attachments[0].title_link = 'https://title_link/test.html';

		// Post and verify payload using attachments title_link works as expected.
		fb(robot, payload);

		expect(robot.emit).to.have.been.calledWith('fb.message');
		expect(robot.emit).to.have.been.calledThrice;
		let message = robot.emit.args[0][1];
		expect(message).to.have.deep.property('message.attachment.type', 'template');
		let attachment = message.message.attachment;
		expect(attachment).to.have.deep.property('payload.template_type', 'generic');
		expect(attachment).to.have.deep.property('payload.elements').to.be.length(1);
		expect(attachment).to.have.deep.property('payload.elements[0].item_url').to.equal('https://goo.gl/o1sWMI');

		expect(robot.emit).to.have.been.calledWith('fb.message');
		message = robot.emit.args[1][1];
		expect(message).to.have.deep.property('message.attachment.type', 'template');
		attachment = message.message.attachment;
		expect(attachment).to.have.deep.property('payload.template_type', 'generic');
		expect(attachment).to.have.deep.property('payload.elements').to.be.length(1);
		expect(attachment).to.have.deep.property('payload.elements[0].item_url').to.equal('https:/goo.gl/o1sWMI');

		expect(robot.emit).to.have.been.calledWith('fb.message');
		message = robot.emit.args[2][1];
		expect(message).to.have.deep.property('message.attachment.type', 'template');
		attachment = message.message.attachment;
		expect(attachment).to.have.deep.property('payload.template_type', 'generic');
		expect(attachment).to.have.deep.property('payload.elements').to.be.length(1);
		expect(attachment).to.have.deep.property('payload.elements[0].item_url').to.equal('https://title_link/test.html');
	});

	it('should reply with a properly formatted response', function() {
		let testInput = '**strong**, *highlight*, \n>blockquote';
		let expectedOutput = '\'strong\', \'highlight\', \nblockquote';
		let sendFunc = function(arg) {};
		const payload = {
			message: testInput,
			response: {
				envelope: {},
				send: sendFunc
			}
		};

		fb(robot, payload);
		expect(robot.emit).to.have.been.calledWith('fb.message');

		const resp = robot.emit.args[0][1];
		expect(resp).to.exist;
		expect(resp).to.have.deep.property('message.text', expectedOutput);
	});

	it('should repalce escapable characters with unicode equivalents', function() {
		let testInput = '"It\'s about time."';
		let expectedOutput = '\u201cIt\u2019s about time.\u201d';
		const payload = {
			message: testInput,
			response: {
				reply: function() {}
			}
		};

		fb(robot, payload);
		expect(robot.emit).to.have.been.calledWith('fb.message');

		const resp = robot.emit.args[0][1];
		expect(resp).to.exist;
		expect(resp).to.have.deep.property('message.text', expectedOutput);
	});
});
