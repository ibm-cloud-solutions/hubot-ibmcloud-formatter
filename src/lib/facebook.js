/*
 * Licensed Materials - Property of IBM
 * (C) Copyright IBM Corp. 2016. All Rights Reserved.
 * US Government Users Restricted Rights - Use, duplication or
 * disclosure restricted by GSA ADP Schedule Contract with IBM Corp.
 */
'use strict';

// character limits for messenger:

// Generic template:
// Title: 80 characters
// Subtitle: 80 characters
// Call-to-action title: 20 characters
// Call-to-action items: 3 buttons
// Bubbles per message (horizontal scroll): 10 elements
// - title and at least one other field (image url, subtitle or buttons) is required with non-empty value

// Regular message:
// 320 characters

const path = require('path');
const TAG = path.basename(__filename);
const fs = require('fs');

const _ = require('lodash');
const marked = require('marked');

const FB_HORIZONTAL_LIMIT = 10;
const ELLIPSIS = '...';

// Custom renderer to strip out the formatting not supported by FB
const renderer = new marked.Renderer();
// Handle bold, marked by: **text**
renderer.strong = function(text) {
	return '\'' + text + '\'';
};
// Eliminatinate creation of <p> and </p> tags.
renderer.paragraph = function(text) {
	return text;
};
// Handle highlignting, marked by *text*
renderer.em = function(text) {
	return '\'' + text + '\'';
};
// Handle a block of text highlighted, marked by >text
renderer.blockquote = function(text) {
	return '\n' + text;
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
	for (let i = 0; i < listItems.length; i++) {
		if (i !== 0) {
			output += '\n';
		}
		// Add in the number (ordered) or the dash (unordered)
		output += (ordered ? ((i + 1) + '. ') : '- ') + listItems[i];
	}
	return output;
};

/**
 * Truncates a message that is 80 characters or longer
 * @param {String} the message to truncate
 * @returns {String} A message that may be truncated with trailing ellipsis
 */
function truncate(str) {
	if (str && str.length >= 80) {
		str = str.substring(0, 75) + ELLIPSIS;
	}
	return str;
}

let extractTitle = function extractTitle(attachment) {
	let title = '';
	if (attachment.title){
		title = attachment.title;
	}
	else if (attachment.text) {
		// fallback to using the text
		title = attachment.text;
	}
	else if (attachment.fields && attachment.fields[0]) {
		// fall back to try using the first field arbitrarily
		let field = attachment.fields[0];
		if (field.title) {
			title = field.title;
		}
		else if (field.value) {
			title = field.value;
		}
	}

	return truncate(title);
};

let extractImageUrl = function extractImageUrl(attachment) {
	let image = null;
	if (attachment.image_url) {
		image = attachment.image_url;
	}
	else if (attachment.thumb_url) {
		image = attachment.thumb_url;
	}
	else if (attachment.author_icon) {
		image = attachment.author_icon;
	}
	else if (attachment.footer_icon) {
		image = attachment.footer_icon;
	}
	return image;
};

let extractAttachmentText = function extractAttachmentText(attachment) {
	let text = '';
	if (attachment.pretext) {
		text = attachment.pretext;
	}
	if (attachment.text) {
		if (text.length > 0) {
			text += ' ' + attachment.text;
		}
		else {
			text = attachment.text;
		}
	}
	else if (text.length === 0 && attachment.fallback) {
		text = attachment.fallback;
	}

	return truncate(text);
};

let extractFieldText = function extractFieldText(attachment, text) {
	if (attachment.fields && text.length < 80) {
		for (let field of attachment.fields) {
			let fieldStr = field.title + ': ' + field.value;
			if (text.length === 0) {
				text += fieldStr;
			}
			else {
				text += ', ' + fieldStr;
			}
		}
	}

	return truncate(text);
};

let sendData = function sendData(robot, res, richMsg) {
	robot.logger.debug(`${TAG}: Sending data - ${richMsg}`);
	robot.emit('fb.message', {envelope: res.envelope, message: richMsg});
};

let extractContentUrl = function extractContentUrl(attachment) {
	let url = null;
	if (attachment.title_link) {
		url = attachment.title_link;
	}
	else if (attachment.fields) {
		for (let field of attachment.fields) {
			if (field.title.toLowerCase() === 'url') {
				url = field.value;
			}
			else if (field.title.toLowerCase() === 'urls') {
				url = field.value.split(', ')[0];
			}
		}
	}
	return url;
};

let sendAttachments = function sendAttachments(robot, res, attachments) {
	let elements = attachments.map((attach) => {
		let element = {};
		let title = extractTitle(attach);
		let image = extractImageUrl(attach);
		let text = extractAttachmentText(attach);
		let url = extractContentUrl(attach);
		text = extractFieldText(attach, text);
		element.title = title;
		if (text.length > 0) {
			element.subtitle = text;
		}
		if (image) {
			element.image_url = image;
		}
		if (url) {
			element.item_url = url;
		}
		if (_.isNull(image) && text.length === 0) {
			element.subtitle = '...';
		}
		return element;
	});

	let richMsg = {
		attachment: {
			type: 'template',
			payload: {
				template_type: 'generic',
				elements: elements
			}
		}
	};

	sendData(robot, res, richMsg);
};

// Handle the send of a simple message (not attachment).  Consider
// size limitations of FB messages.
let sendMessage = function sendMessage(robot, res, message) {
	//  Handle the formatting first.
	message = marked(message, {renderer: renderer, smartypants: true});
	// Handle message size that is too large by breaking it up.
	if (message.length >= 300) {
		while (message.length > 0) {
			let length = (message.length > 300) ? 300 : message.length;
			let snippet = message.substring(0, length);
			sendData(robot, res, {text: snippet});
			message = message.substring(300);
		}
	}
	else {
		sendData(robot, res, {text: message});
	}
};

module.exports = (robot, attachment) => {
	let res = attachment.response;
	let attachments = attachment.attachments;

	// Look for plain string messages.
	if (!attachments || attachment.message) {
		sendMessage(robot, res, attachment.message);
		return;
	}
	else if (attachment && attachment.filePath && attachment.fileName) {
		fs.unlinkSync(attachment.filePath);
		robot.logger.debug(`${TAG}: Uploading file is not supported`);
		sendMessage(robot, res, `Uploading file is not supported for '${robot.adapterName}' adapter.`);
		return;
	}
	// Look for a message that should have attachments, but doesn't.
	else if (attachments && attachments.length === 0) {
		sendAttachments(robot, res, attachments);
		return;
	}
	else if (attachments && attachments.length > 0) {
		// Handle attachments
		let i, j, slicedAttachments;
		for (i = 0, j = attachments.length; i < j; i += FB_HORIZONTAL_LIMIT) {
			slicedAttachments = attachments.slice(i, i + FB_HORIZONTAL_LIMIT);
			sendAttachments(robot, res, slicedAttachments);
		}
	}
	else {
		robot.logger.warning(`${TAG}: emitter encountered invalid data format ${attachment}; no attachment.message or attachment.attachments found. No message will appear to the user.`);
	}
};
