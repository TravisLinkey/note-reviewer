import { Plugin } from "obsidian"

export default class ExamplePlugin extends Plugin {
	onload(): void {
		console.log("Hello World")
	}
}
