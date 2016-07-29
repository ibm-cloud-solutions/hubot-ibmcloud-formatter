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
		responseMessage = `File downloaded and available ${pathToFile}`;
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
		responseMessage = 'No results found';
	}

	robot.logger.debug(`${TAG}: Sending response - ${responseMessage}`);
	attachment.response.send(responseMessage);
};
