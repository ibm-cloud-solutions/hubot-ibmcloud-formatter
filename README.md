[![Build Status](https://travis-ci.org/ibm-cloud-solutions/hubot-ibmcloud-formatter.svg?branch=master)](https://travis-ci.org/ibm-cloud-solutions/hubot-ibmcloud-formatter)
[![Dependency Status](https://dependencyci.com/github/ibm-cloud-solutions/hubot-ibmcloud-formatter/badge)](https://dependencyci.com/github/ibm-cloud-solutions/hubot-ibmcloud-formatter)
[![Coverage Status](https://coveralls.io/repos/github/ibm-cloud-solutions/hubot-ibmcloud-formatter/badge.svg?branch=master)](https://coveralls.io/github/ibm-cloud-solutions/hubot-ibmcloud-formatter?branch=master)
[![npm version](https://img.shields.io/npm/v/hubot-ibmcloud-formatter.svg?maxAge=2592000)](https://www.npmjs.com/package/hubot-ibmcloud-formatter)



# hubot-ibmcloud-formatter

Listens for messages sent via `robot.emit` directed at `ibmcloud.formatter` and formats them appropriately for the given hubot adapter.

## Usage

```javascript
robot.respond(/hello/, (response) => {
	robot.emit('ibmcloud.formatter', {
		response: response,
		attachments: [
			{
				title: 'A fancy hello',
				text: 'Greetings and salutations.'
			}
		]
	});
})
```

## License <a id="license"></a>

See [LICENSE.txt](./LICENSE.txt) for license information.

## Contribute <a id="contribute"></a>

Please check out our [Contribution Guidelines](./CONTRIBUTING.md) for detailed information on how you can lend a hand.
