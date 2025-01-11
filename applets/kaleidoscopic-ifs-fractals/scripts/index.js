import { showPage } from "../../../scripts/src/loadPage.js";
import { KaleidoscopicIFSFractals } from "./class.js";
import { getRotationMatrix } from "/scripts/applets/raymarchApplet.js";
import { DownloadButton } from "/scripts/src/buttons.js";
import { Checkbox } from "/scripts/src/checkboxes.js";
import { Dropdown } from "/scripts/src/dropdowns.js";
import { $ } from "/scripts/src/main.js";
import { typesetMath } from "/scripts/src/math.js";
import { siteSettings } from "/scripts/src/settings.js";
import { Slider } from "/scripts/src/sliders.js";
import { TextBox } from "/scripts/src/textBoxes.js";

const minScale = 1.125;
const minScaleEpsilon = .00003;
const maxScaleEpsilon = .0000003;

export default function()
{
	const resolutionInput = new TextBox({
		element: $("#resolution-input"),
		name: "Resolution",
		value: 500,
		minValue: 100,
		maxValue: 1000,
		onInput: changeResolution
	});

	const rotationAngleXSlider = new Slider({
		element: $("#rotation-angle-x-slider"),
		name: "$\\theta_x$",
		value: 0,
		min: 0,
		max: 2 * Math.PI,
		onInput: onSliderInput
	});

	const rotationAngleYSlider = new Slider({
		element: $("#rotation-angle-y-slider"),
		name: "$\\theta_y$",
		value: 0,
		min: 0,
		max: 2 * Math.PI,
		onInput: onSliderInput
	});

	const rotationAngleZSlider = new Slider({
		element: $("#rotation-angle-z-slider"),
		name: "$\\theta_z$",
		value: 0,
		min: 0,
		max: 2 * Math.PI,
		onInput: onSliderInput
	});

	const polyhedraDropdown = new Dropdown({
		element: $("#polyhedra-dropdown"),
		name: "Polyhedra",
		options: {
			tetrahedron: "Tetrahedron",
			cube: "Cube",
			octahedron: "Octahedron",
			dodecahedron: "Dodecahedron",
			icosahedron: "Icosahedron"
		},
		onInput: onDropdownInput
	});

	const scaleSlider = new Slider({
		element: $("#scale-slider"),
		name: "Scale",
		value: 2,
		min: minScale,
		max: 8 / 3,
		onInput: onSliderInput
	});

	const lockOnOriginCheckbox = new Checkbox({
		element: $("#lock-on-origin-checkbox"),
		name: "Lock on origin",
		checked: true,
		onInput: onCheckboxInput
	});

	const shadowsCheckbox = new Checkbox({
		element: $("#shadows-checkbox"),
		name: "Shadows",
		onInput: onCheckboxInput
	});

	const antialiasingCheckbox = new Checkbox({
		element: $("#antialiasing-checkbox"),
		name: "Antialiasing",
		onInput: onCheckboxInput
	});

	const applet = new KaleidoscopicIFSFractals({
		canvas: $("#output-canvas"),
		shape: polyhedraDropdown.value || "octahedron",
	});

	new DownloadButton({
		element: $("#download-button"),
		applet,
		filename: "a-kaleidoscopic-ifs-fractal.png"
	});

	typesetMath();

	showPage();

	function onSliderInput()
	{
		// Exponentially interpolate from minScaleEpsilon to maxScaleEpsilon.
		const power = (scaleSlider.value - minScale) / (2 - minScale)
			* Math.log10(minScaleEpsilon / maxScaleEpsilon);

		// Interpolate from 44 at 8/3 to 56 at 2.
		const numIterations = Math.floor(
			44 - (56 - 44) * (scaleSlider.value - 8 / 3) / (8 / 3 - 2)
		);

		applet.setUniforms({
			scale: scaleSlider.value,
			minEpsilon: minScaleEpsilon / Math.pow(10, power),
			numIterations,
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

	function onDropdownInput()
	{
		applet.changePolyhedron(polyhedraDropdown.value);
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