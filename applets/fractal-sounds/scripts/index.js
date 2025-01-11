import { showPage } from "../../../scripts/src/loadPage.js";
import { FractalSounds } from "./class.js";
import { DownloadButton } from "/scripts/src/buttons.js";
import { Dropdown } from "/scripts/src/dropdowns.js";
import { $ } from "/scripts/src/main.js";
import { siteSettings } from "/scripts/src/settings.js";
import { TextBox } from "/scripts/src/textBoxes.js";

export default function()
{
	const applet = new FractalSounds({
		canvas: $("#output-canvas"),
		lineDrawerCanvas: $("#line-drawer-canvas")
	});

	applet.loadPromise.then(() => run());

	new DownloadButton({
		element: $("#download-button"),
		applet,
		filename: "a-sound-fractal.png"
	});



	const examples =
	{
		mandelbrot: [
			"cmul(z, z) + c",
			(x, y, a, b) => [x * x - y * y + a, 2 * x * y + b]
		],

		sfx: [
			"cmul(z, dot(z, z)) - cmul(z, c*c)",
			(x, y, a, b) => [
				x * x * x + x * y * y - x * a * a + y * b * b,
				x * x * y - x * b * b + y * y * y - y * a * a
			]
		],

		burningShip: [
			"-vec2(z.x * z.x - z.y * z.y, 2.0 * abs(z.x * z.y)) + c",
			(x, y, a, b) => [-(x * x - y * y) + a, -(2 * Math.abs(x * y)) + b]
		],

		feather: [
			"cdiv(cmul(cmul(z, z), z), ONE + z*z) + c",
			(x, y, a, b) => [
				a + (
					x * x * x * x * x + x * x * x * (1 - 3 * y * y)
					+ 3 * x * x * y * y * y
					- 3 * x * y * y
					- y * y * y * y * y
				) / (
					x * x * x * x
					+ 2 * x * x + y * y * y * y + 1
				),
				b + (
					y * (
						3 * x * x * x * x
						- x * x * x * y
						- x * x * (y * y - 3)
						+ 3 * x * y * y * y - y * y
					)
				) / (
					x * x * x * x
					+ 2 * x * x + y * y * y * y
					+ 1
				)
			]
		],

		duffing: [
			"vec2(z.y, -c.y * z.x + c.x * z.y - z.y * z.y * z.y)",
			(x, y, a, b) => [y, -b * x + a * y - y * y * y]
		],

		ikeda: [
			// eslint-disable-next-line max-len
			"vec2(1.0 + c.x * (z.x * cos(.4 - 6.0 / (1.0 + dot(z, z))) - z.y * sin(.4 - 6.0 / (1.0 + dot(z, z)))), c.y * (z.x * sin(.4 - 6.0 / (1.0 + dot(z, z))) + z.y * cos(.4 - 6.0 / (1.0 + dot(z, z)))))",
			(x, y, a, b) => [
				1.0 + a * (
					x * Math.cos(.4 - 6.0 / (1.0 + x * x + y * y))
					- y * Math.sin(.4 - 6.0 / (1.0 + x * x + y * y))
				),
				b * (
					x * Math.sin(.4 - 6.0 / (1.0 + x * x + y * y))
					+ y * Math.cos(.4 - 6.0 / (1.0 + x * x + y * y))
				)
			]
		]
	};

	const fractalsDropdown = new Dropdown({
		element: $("#fractals-dropdown"),
		name: "Fractals",
		options: {
			mandelbrot: "Mandelbrot",
			sfx: "SFX Fractal",
			burningShip: "Burning Ship",
			feather: "Feather Fractal",
			duffing: "Duffing",
			ikeda: "Ikeda"
		},
		onInput: run
	});

	const resolutionInput = new TextBox({
		element: $("#resolution-input"),
		name: "Resolution",
		value: 500,
		minValue: 100,
		maxValue: 2000,
		onEnter: run,
		onInput: changeResolution
	});

	showPage();

	function run()
	{
		const value = fractalsDropdown.value || "mandelbrot";

		const glslCode = examples[value][0];
		const jsCode = examples[value][1];
		const resolution = resolutionInput.value * siteSettings.resolutionMultiplier;
		const numIterations = 200;

		applet.run({
			glslCode,
			jsCode,
			resolution,
			numIterations
		});
	}

	function changeResolution()
	{
		applet.wilsonJulia.resizeCanvas({
			width: resolutionInput.value * siteSettings.resolutionMultiplier
		});

		applet.wilson.resizeCanvas({
			width: Math.min(
				Math.floor(resolutionInput.value * siteSettings.resolutionMultiplier * 3),
				2000
			)
		});
	}
}