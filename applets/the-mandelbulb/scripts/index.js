import { showPage } from "../../../scripts/src/loadPage.js";
import { Mandelbulb } from "./class.js";
import { getRotationMatrix } from "/scripts/applets/raymarchApplet.js";
import { DownloadButton, ToggleButton } from "/scripts/src/buttons.js";
import { Checkbox } from "/scripts/src/checkboxes.js";
import { $ } from "/scripts/src/main.js";
import { typesetMath } from "/scripts/src/math.js";
import { siteSettings } from "/scripts/src/settings.js";
import { Slider } from "/scripts/src/sliders.js";
import { TextBox } from "/scripts/src/textBoxes.js";

export default function()
{
	const applet = new Mandelbulb({
		canvas: $("#output-canvas"),
	});

	new ToggleButton({
		element: $("#switch-bulb-button"),
		name0: "Switch to Juliabulb",
		name1: "Return to Mandelbulb",
		onClick0: (instant) => applet.switchBulb(instant),
		onClick1: (instant) => applet.switchBulb(instant)
	});

	new DownloadButton({
		element: $("#download-button"),
		applet,
	});

	const resolutionInput = new TextBox({
		element: $("#resolution-input"),
		name: "Resolution",
		value: 400,
		minValue: 100,
		maxValue: 750,
		onInput: changeResolution
	});

	const powerSlider = new Slider({
		element: $("#power-slider"),
		name: "Power",
		value: 8,
		min: 2,
		max: 12,
		snapPoints: [3, 4, 5, 6, 7, 8, 9, 10, 11],
		onInput: onSliderInput
	});

	const cXSlider = new Slider({
		element: $("#c-x-slider"),
		name: "$c_x$",
		value: 0,
		min: -1,
		max: 1,
		snapPoints: [0],
		onInput: onSliderInput
	});

	const cYSlider = new Slider({
		element: $("#c-y-slider"),
		name: "$c_y$",
		value: 0,
		min: -1,
		max: 1,
		snapPoints: [0],
		onInput: onSliderInput
	});

	const cZSlider = new Slider({
		element: $("#c-z-slider"),
		name: "$c_z$",
		value: 0,
		min: -1,
		max: 1,
		snapPoints: [0],
		onInput: onSliderInput
	});

	const rotationAngleXSlider = new Slider({
		element: $("#rotation-angle-x-slider"),
		name: "$\\theta_x$",
		value: 0,
		min: 0,
		max: Math.PI,
		onInput: onSliderInput
	});

	const rotationAngleYSlider = new Slider({
		element: $("#rotation-angle-y-slider"),
		name: "$\\theta_y$",
		value: 0,
		min: 0,
		max: Math.PI,
		onInput: onSliderInput
	});

	const rotationAngleZSlider = new Slider({
		element: $("#rotation-angle-z-slider"),
		name: "$\\theta_z$",
		value: 0,
		min: 0,
		max: Math.PI,
		onInput: onSliderInput
	});

	const shadowsCheckbox = new Checkbox({
		element: $("#shadows-checkbox"),
		name: "Shadows",
		onInput: onCheckboxInput
	});

	const lockOnOriginCheckbox = new Checkbox({
		element: $("#lock-on-origin-checkbox"),
		name: "Lock on origin",
		checked: true,
		onInput: onCheckboxInput
	});

	const antialiasingCheckbox = new Checkbox({
		element: $("#antialiasing-checkbox"),
		name: "Antialiasing",
		onInput: onCheckboxInput
	});

	typesetMath();

	showPage();

	function onSliderInput()
	{
		applet.setUniforms({
			power: powerSlider.value,
			c: [cXSlider.value, cYSlider.value, cZSlider.value],
			rotationMatrix: getRotationMatrix(
				rotationAngleXSlider.value,
				rotationAngleYSlider.value,
				rotationAngleZSlider.value
			)
		});
	}

	function changeResolution()
	{
		applet.wilson.resizeCanvas({
			width: resolutionInput.value * siteSettings.resolutionMultiplier
		});
	}

	function onCheckboxInput()
	{
		applet.setLockedOnOrigin(lockOnOriginCheckbox.checked);

		if (
			applet.useShadows !== shadowsCheckbox.checked
			|| applet.useAntialiasing !== antialiasingCheckbox.checked
		) {
			applet.useShadows = shadowsCheckbox.checked;
			applet.useAntialiasing = antialiasingCheckbox.checked;
			applet.reloadShader();
		}
	}
}