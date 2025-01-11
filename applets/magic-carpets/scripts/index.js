import { showPage } from "../../../scripts/src/loadPage.js";
import { MagicCarpets } from "./class.js";
import { Button, DownloadButton, GenerateButton } from "/scripts/src/buttons.js";
import { Checkbox } from "/scripts/src/checkboxes.js";
import { $ } from "/scripts/src/main.js";
import { TextBox } from "/scripts/src/textBoxes.js";

export default function()
{
	const applet = new MagicCarpets({ canvas: $("#output-canvas") });

	new GenerateButton({
		element: $("#generate-button"),
		onClick: run
	});

	new Button({
		element: $("#draw-solution-button"),
		name: "Show Solution",
		onClick: () => applet.drawSolution()
	});

	new Button({
		element: $("#draw-rectangles-button"),
		name: "Show Rectangles Only",
		onClick: () => applet.drawSolution(true)
	});

	new DownloadButton({
		element: $("#download-button"),
		applet,
		filename: "a-magic-carpet.png"
	});

	const gridSizeInput = new TextBox({
		element: $("#grid-size-input"),
		name: "Grid Size",
		value: 8,
		minValue: 3,
		maxValue: 100,
		onEnter: run
	});

	const maxCageSizeInput = new TextBox({
		element: $("#max-cage-size-input"),
		name: "Max Cage Size",
		value: 16,
		minValue: 2,
		onEnter: run
	});

	const uniqueSolutionCheckbox = new Checkbox({
		element: $("#unique-solution-checkbox"),
		name: "Require unique solution"
	});

	function run()
	{
		applet.run({
			gridSize: gridSizeInput.value,
			maxCageSize: maxCageSizeInput.value,
			uniqueSolution: uniqueSolutionCheckbox.checked
		});
	}

	run();

	showPage();
}