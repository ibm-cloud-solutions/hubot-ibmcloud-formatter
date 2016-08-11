/*
 * Licensed Materials - Property of IBM
 * (C) Copyright IBM Corp. 2016. All Rights Reserved.
 * US Government Users Restricted Rights - Use, duplication or
 * disclosure restricted by GSA ADP Schedule Contract with IBM Corp.
 */
'use strict';

var path = require('path');
var TAG = path.basename(__filename);
const fs = require('fs');

const _ = require('lodash');
const marked = require('marked');

const i18n = new (require('i18n-2'))({
	locales: ['en'],
	extension: '.json',
	// Add more languages to the list of locales when the files are created.
	directory: __dirname + '/../messages',
	defaultLocale: 'en',
	// Prevent messages file from being overwritten in error conditions (like poor JSON).
	updateFiles: false
});
// At some point we need to toggle this setting based on some user input.
i18n.setLocale('en');

// -------------------------------------------------------
// Custom renderer to strip out all markdown formatting
// included in messages.
// -------------------------------------------------------
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
// Format a string to the requested width, filling extra
// space with the 'padding' character.
// -------------------------------------------------------
function formatString(string, width, padding) {
	return (width <= string.length) ? string : formatString(string + padding, width, padding);
}

// -------------------------------------------------------
// Build an ascii art table based on the input string.
// - newline characters separate the row values
// - tab characters separate the column values
// -------------------------------------------------------
function asciiToTable(input) {
	// First split the input up by newline characters.
	var rows = input.split('\n');
	// Pass 1: Iterate the rows to determine the max width of each column.
	var columnWidths = [];
	for (var i = 0; i < rows.length; i++) {
		var row = rows[i];
		var columns = row.split('\t');
		for (var j = 0; j < columns.length; j++) {
			var element = columns[j];
			if (columnWidths.length <= j || columnWidths[j] < element.length) {
				columnWidths[j] = element.length;
			}
		}
	}
	// Pass 2: Format the table based on the max column widths.
	var output = '';
	for (i = 0; i < rows.length; i++) {
		if (i !== 0) {
			output += '\n';
		}
		row = rows[i];
		columns = row.split('\t');
		for (j = 0; j < columns.length; j++) {
			element = columns[j];
			if (j === columns.length - 1) {
				// Last column.  No special formatting
				output += element;
			}
			else {
				output += formatString(element, columnWidths[j] + 3, ' ');
			}
		}
	}

	return output;
}

module.exports = (robot, attachment) => {
	let responseMessage = '';
	if (attachment.message) {
		// Handle a basic message as a string, but strip formatting first.
		responseMessage = marked(attachment.message, {
			renderer: renderer,
			smartypants: true
		});
	}
	else if (attachment && attachment.filePath && attachment.fileName) {
		let pathToFile = fs.realpathSync(attachment.filePath);

		robot.logger.debug(`${TAG}: File downloaded and available ${pathToFile}`);
		responseMessage = i18n.__('formatter.file.downloaded', pathToFile);
	}
	else if (attachment && attachment.attachments) {
		// Handle attachments, formatting into an ascii table.
		_.forEach(attachment.attachments, function(responseAttachment) {
			if (responseAttachment.title && responseAttachment.text) {
				responseMessage += responseAttachment.title + ': ' + responseAttachment.text + '\n';
			}
			else if (responseAttachment.title) {
				responseMessage += responseAttachment.title + '\n';
			}
			else if (responseAttachment.text) {
				responseMessage += responseAttachment.text + '\n';
			}

			let sortedFields = _.sortBy(responseAttachment.fields, ['title']);

			_.forEach(sortedFields, function(field) {
				responseMessage += (field.title ? field.title : '') + '\t';
				responseMessage += (field.value ? field.value : '') + '\n';
			});
			responseMessage += '\n';
		});

		responseMessage = asciiToTable(responseMessage);
	}
	else {
		responseMessage = i18n.__('formatter.no.results.found');
	}

	robot.logger.debug(`${TAG}: Sending response - ${responseMessage}`);
	attachment.response.send(responseMessage);
};
