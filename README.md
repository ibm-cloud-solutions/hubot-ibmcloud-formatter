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
