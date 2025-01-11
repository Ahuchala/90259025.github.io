import { showPage } from "../../../scripts/src/loadPage.js";
import { VoronoiDiagrams } from "./class.js";
import { DownloadButton, GenerateButton } from "/scripts/src/buttons.js";
import { Checkbox } from "/scripts/src/checkboxes.js";
import { $ } from "/scripts/src/main.js";
import { siteSettings } from "/scripts/src/settings.js";
import { Slider } from "/scripts/src/sliders.js";
import { TextBox } from "/scripts/src/textBoxes.js";

export default function()
{
	const applet = new VoronoiDiagrams({ canvas: $("#output-canvas") });

	const resolutionInput = new TextBox({
		element: $("#resolution-input"),
		name: "Resolution",
		value: 1000,
		minValue: 100,
		maxValue: 4000,
		onEnter: run,
	});

	const numPointsInput = new TextBox({
		element: $("#num-points-input"),
		name: "Points",
		value: 20,
		minValue: 3,
		maxValue: 100,
		onEnter: run,
	});

	new GenerateButton({
		element: $("#generate-button"),
		onClick: run
	});

	new DownloadButton({
		element: $("#download-button"),
		applet,
		filename: "a-voronoi-diagram.png"
	});

	const metricSlider = new Slider({
		element: $("#metric-slider"),
		name: "Metric",
		value: 2,
		min: 1,
		max: 24,
		snapPoints: [2],
		logarithmic: true,
		onInput: onSliderInput
	});

	const useDraggableCheckbox = new Checkbox({
		element: $("#use-draggable-checkbox"),
		name: "Use draggable"
	});

	const hidePointsCheckbox = new Checkbox({
		element: $("#hide-points-checkbox"),
		name: "Hide points",
		checked: true
	});

	const maximumSpeedCheckbox = new Checkbox({
		element: $("#maximum-speed-checkbox"),
		name: "Maximum speed"
	});

	showPage();

	function run()
	{
		applet.run({
			resolution: resolutionInput.value * siteSettings.resolutionMultiplier,
			numPoints: numPointsInput.value,
			metric: metricSlider.value,
			maximumSpeed: maximumSpeedCheckbox.checked,
			drawPoints: !hidePointsCheckbox.checked,
			useDraggable: useDraggableCheckbox.checked
		});
	}

	function onSliderInput()
	{
		applet.metric = metricSlider.value;

		applet.updateMetric();
	}
}