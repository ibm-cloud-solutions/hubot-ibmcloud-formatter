/*
 * Licensed Materials - Property of IBM
 * (C) Copyright IBM Corp. 2016. All Rights Reserved.
 * US Government Users Restricted Rights - Use, duplication or
 * disclosure restricted by GSA ADP Schedule Contract with IBM Corp.
 */
'use strict';

const request = require('request');
const path = require('path');
const TAG = path.basename(__filename);
const fs = require('fs');

const marked = require('marked');
const renderer = new marked.Renderer();

// Handle bold, marked by: **text**
renderer.strong = function(text) {
	return '*' + text + '*';
};
// Eliminatinate creation of <p> and </p> tags.
renderer.paragraph = function(text) {
	return text;
};
// Handle highlignting, marked by *text*
renderer.em = function(text) {
	return '`' + text + '`';
};
// Handle a block of text highlighted, marked by >text
renderer.blockquote = function(text) {
	return '```' + text + '```';
};
// Handle a link, return it as is vs adding in the tags around it, <a href="">....
renderer.link = function(href, title, text) {
	return href;
};
// If a list is passed into the formatter, each list item will be sent here.
// By default, html tags will be put on them, <li> and </li>.  By overriding
// it here, we can have it just return the text.
renderer.listitem = function(text) {
	return '\n' + text;
};
// Handle a list.  The listitem function above handles the item tags, but this
// will handle preventing the <ol></ol> or <ul></ul> tags from being added.
// The list must be parsed and put in a generic format to work.
renderer.list = function(body, ordered) {
	let output = '\n';
	// If there is a leading newline, strip it.  Seems to always be there.
	if (body.indexOf('\n') === 0) {
		body = body.replace('\n', '');
	}
	// First split up the body based on newlines to get the list items.
	let listItems = body.split('\n');
	for (var i = 0; i < listItems.length; i++) {
		if (i !== 0) {
			output += '\n';
		}
		// Add in the number (ordered) or the dash (unordered)
		output += (ordered ? ((i + 1) + '. ') : '- ') + listItems[i];
	}
	return output;
};

// -------------------------------------------------------
// This is the slack adapter entry point where messages will
// get modified from a generic form to something Slack specific.
// Simple messages will got through a formatter to handle special
// tags for bold, italics, highlighting, etc.  Block responses
// for things like tables are already in a form suitable for slack.
// -------------------------------------------------------
module.exports = (robot, attachment) => {

	if (attachment && attachment.message) {
		// Detect hrefs in the strings.  Not clean in marked out of the box.
		// Replace <a href="link">link_text</a> with simply link.
		let re = /<a href="(.+)">.*<\/a>/i;
		attachment.message = attachment.message.replace(re, '$1');

		robot.logger.debug(`${TAG}: Sending simple message - ${attachment.message}`);
		// This is a simple string message.  Run it through the formatter first.
		attachment.response.reply(marked(attachment.message, {
			renderer: renderer,
			smartypants: true
		}));
	}
	else if (attachment && attachment.filePath && attachment.fileName) {
		let slackToken = robot.adapter.options.token;
		let slackChannel = attachment.response.message.room;

		robot.logger.debug(`${TAG}: Uploading file to slack - ${attachment.fileName}`);
		let file = fs.createReadStream(attachment.filePath);
		request.post({
			url: 'https://slack.com/api/files.upload',
			formData: {
				token: slackToken,
				title: attachment.fileName,
				filename: attachment.fileName,
				filetype: 'auto',
				channels: slackChannel,
				file: file
			}

		}, function(err, res) {
			fs.unlinkSync(attachment.filePath);
			if (err) {
				robot.logger.error(err);
			}
			else {
				if (res.statusCode === 200) {
					robot.logger.debug(`${TAG}: Successfully uploaded ${attachment.filePath} to slack.`);
				}
				else {
					robot.logger.error(new Error(`${TAG}: Slack upload failed.`));
				}
			}
		});
	}
	else if (attachment && attachment.response && attachment.response.message && attachment.attachments) {
		robot.logger.debug(`${TAG}: Sending attachment - ${attachment.attachments}`);
		// If no attachments length, send now.
		if (attachment.attachments.length === 0) {
			attachment.response.send({
				attachments: attachment.attachments,
				as_user: true
			});
			return;
		}

		// Extra logic is needed here to ensure we don't send more than slack allows.
		// Break up the list of attachments into smaller chunks.  Note, however, that
		// there is no promise that the ordering between chunks is correct.
		let maxAttachments = 50;
		let remainingAttachments = attachment.attachments.length;
		let currentIndex = 0;
		while (remainingAttachments > 0) {
			// Grab the next 50 attachments to send, or if < 50, whatever remains.
			let numAttachmentsToSend = maxAttachments;
			if (remainingAttachments < 50) {
				numAttachmentsToSend = remainingAttachments;
			}

			// Copy the number of attachments to send into a new array.
			let smallAttachments = [];
			for (var i = 0; i < numAttachmentsToSend; i++) {
				smallAttachments.push(attachment.attachments[currentIndex++]);
			}
			attachment.response.send({
				attachments: smallAttachments,
				as_user: true
			});
			// Adjust how many remain based on how many were just sent.
			remainingAttachments -= numAttachmentsToSend;
		}
	}
	else {
		robot.logger.warning(
			`${TAG}: emitter encountered invalid data format ${attachment}; no attachment.message or attachment.attachments found. No message will appear to the user.`
		);
	}
};
