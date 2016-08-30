/*
 * Licensed Materials - Property of IBM
 * (C) Copyright IBM Corp. 2016. All Rights Reserved.
 * US Government Users Restricted Rights - Use, duplication or
 * disclosure restricted by GSA ADP Schedule Contract with IBM Corp.
 */
'use strict';

const path = require('path');
const TAG = path.basename(__filename);
const fs = require('fs');

const _ = require('lodash');
const marked = require('marked');
marked.setOptions({
	renderer: new marked.Renderer(),
	gfm: true,
	tables: true,
	smartypants: true
});

module.exports = (robot, attachment) => {
	let responseMessage = '';

	if (attachment.message) {
		// Handle a basic message as a string, but strip formatting first.
		responseMessage = attachment.message;
	}
	else if (attachment && attachment.filePath && attachment.fileName) {
		fs.unlinkSync(attachment.filePath);
		robot.logger.debug(`${TAG}: Uploading file is not supported`);
		responseMessage = `Uploading file is not supported for ${robot.adapterName} adapter.`;
	}
	else if (attachment && attachment.attachments) {
		// Handle attachments, formatting into an ascii table.
		_.forEach(attachment.attachments, function(responseAttachment) {
			if (responseAttachment.pretext) {
				responseMessage += `${responseAttachment.pretext}\n\n`;
			}
			if (responseAttachment.title) {
				responseMessage += `### ${responseAttachment.title}\n\n`;
			}
			if (responseAttachment.text) {
				responseMessage += `${responseAttachment.text}\n\n`;
			}

			let sortedFields = _.sortBy(responseAttachment.fields, ['title']);
			for (let i = 0; i < sortedFields.length; i += 2) {
				const first = sortedFields[i];
				const second = sortedFields[i + 1];
				if (second) {
					if (first.short && second.short) {
						responseMessage +=
							`| ${first.title || ''} | ${second.title || ''} |\n| --- | --- |\n| ${first.value || ''} | ${second.value || ''} |\n\n`;
					}
					else {
						responseMessage += `| ${first.title || ''} |\n| --- |\n| ${first.value || ''} |\n\n`;
						responseMessage += `| ${second.title || ''} |\n| --- |\n| ${second.value || ''} |\n\n`;
					}
				}
				else {
					responseMessage += `| ${first.title || ''} |\n| --- |\n| ${first.value || ''} |\n\n`;
				}
			}

			if (responseAttachment.image_url) {
				responseMessage += `![Image](${responseAttachment.image_url})\n`;
			}
			responseMessage += '\n';
		});
	}
	else {
		responseMessage = 'No results found';
	}
	// responseMessage += '![Create a Facebook Page](/docs/images/Facebook_Create_Page.png)';
	responseMessage = marked(responseMessage);
	robot.logger.debug(`${TAG}: Sending response - ${responseMessage}`);
	attachment.response.send(responseMessage);
};
