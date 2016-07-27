/*
  * Licensed Materials - Property of IBM
  * (C) Copyright IBM Corp. 2016. All Rights Reserved.
  * US Government Users Restricted Rights - Use, duplication or
  * disclosure restricted by GSA ADP Schedule Contract with IBM Corp.
  */
'use strict';

const Helper = require('hubot-test-helper');
const helper = new Helper('../src/scripts');
const expect = require('chai').expect;

// Passing arrow functions to mocha is discouraged: https://mochajs.org/#arrow-functions
// return promises from mocha tests rather than calling done() - http://tobyho.com/2015/12/16/mocha-with-promises/
describe('Interacting with Bluemix via Slack', function() {

	let room;

	beforeEach(function() {
		room = helper.createRoom();
	});

	afterEach(function() {
		room.destroy();
	});

	context('user says something hubot does not care about', function() {
		beforeEach(function() {
			// Don't move on from this until the promise resolves
			return room.user.say('mimiron', '@hubot greetings!');
		});

		it('should not respond', function() {
			expect(room.messages).to.be.length(1);
		});
	});

});
