import { showPage } from "../../../scripts/src/loadPage.js";
import { KickedRotator } from "./class.js";
import { DownloadButton, GenerateButton } from "/scripts/src/buttons.js";
import { $ } from "/scripts/src/main.js";
import { TextBox } from "/scripts/src/textBoxes.js";

export default function()
{
	const applet = new KickedRotator({ canvas: $("#output-canvas") });

	new GenerateButton({
		element: $("#generate-button"),
		onClick: run
	});

	new DownloadButton({
		element: $("#download-button"),
		applet,
		filename: "a-kicked-rotator.png"
	});

	const resolutionInput = new TextBox({
		element: $("#resolution-input"),
		name: "Resolution",
		value: 1000,
		minValue: 100,
		maxValue: 2000,
		onEnter: run
	});

	const kInput = new TextBox({
		element: $("#k-input"),
		name: "K",
		value: 1,
		minValue: 0,
		maxValue: 4,
		onEnter: run
	});

	showPage();

	function run()
	{
		applet.run({
			resolution: resolutionInput.value,
			k: kInput.value,
		});
	}
}