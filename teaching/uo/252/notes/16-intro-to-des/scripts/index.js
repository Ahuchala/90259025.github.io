import { showPage } from "../../../../../../scripts/src/loadPage.js";
import { VectorFields } from "/applets/vector-fields/scripts/class.js";
import {
	createDesmosGraphs,
	desmosBlue,
	desmosPurple,
	setGetDesmosData
} from "/scripts/src/desmos.js";
import { $ } from "/scripts/src/main.js";

export default function()
{
	setGetDesmosData(() =>
	{
		const data =
		{
			directionField:
			{
				bounds: { left: -10, right: 10, bottom: -10, top: 10 },

				expressions:
				[
					{ latex: String.raw`f(x, y) = \frac{1}{30}xy` },
					{ latex: String.raw`n = 10`, sliderBounds: { min: 1, max: 20, step: 1 } },
					{ latex: String.raw`I = [0, 1, ..., (2n + 1)^2 - 1]`, secret: true },
					{ latex: String.raw`A = [-n, -n + 1, ..., n]`, secret: true },
					{ latex: String.raw`X = A[\mod(I, 2n + 1) + 1]`, secret: true },
					{ latex: String.raw`Y = X[\floor(I / (2n + 1)) + 1]`, secret: true },
					{ latex: String.raw`f(X, Y)(x - X) + Y \{\left|x - X\right| \leq \frac{.3}{\sqrt{1 + f(X, Y)^2}}\}`, color: desmosPurple, secret: true },
				]
			},



			directionField2:
			{
				bounds: { left: -10, right: 10, bottom: -10, top: 10 },

				expressions:
				[
					{ latex: String.raw`f(x, y) = \frac{1}{20}(x^2 - 1)\sin(y)` },
					{ latex: String.raw`n = 10`, sliderBounds: { min: 1, max: 20, step: 1 } },
					{ latex: String.raw`I = [0, 1, ..., (2n + 1)^2 - 1]`, secret: true },
					{ latex: String.raw`A = [-n, -n + 1, ..., n]`, secret: true },
					{ latex: String.raw`X = A[\mod(I, 2n + 1) + 1]`, secret: true },
					{ latex: String.raw`Y = X[\floor(I / (2n + 1)) + 1]`, secret: true },
					{ latex: String.raw`f(X, Y)(x - X) + Y \{\left|x - X\right| \leq \frac{.3}{\sqrt{1 + f(X, Y)^2}}\}`, color: desmosPurple, secret: true },
				]
			},



			deSolution:
			{
				bounds: { left: -10, right: 10, bottom: -10, top: 10 },

				expressions:
				[
					{ latex: String.raw`f(x, y) = xy` },
					{ latex: String.raw`c = .1`, sliderBounds: { min: -1, max: 1 } },
					{ latex: String.raw`y = ce^{x^2}`, color: desmosBlue },
					{ latex: String.raw`n = 10`, sliderBounds: { min: 1, max: 20, step: 1 } },
					{ latex: String.raw`I = [0, 1, ..., (2n + 1)^2 - 1]`, secret: true },
					{ latex: String.raw`A = [-n, -n + 1, ..., n]`, secret: true },
					{ latex: String.raw`X = A[\mod(I, 2n + 1) + 1]`, secret: true },
					{ latex: String.raw`Y = X[\floor(I / (2n + 1)) + 1]`, secret: true },
					{ latex: String.raw`f(X, Y)(x - X) + Y \{\left|x - X\right| \leq \frac{.3}{\sqrt{1 + f(X, Y)^2}}\}`, color: desmosPurple, secret: true },
				]
			},



			directionField3:
			{
				bounds: { left: -10, right: 10, bottom: -10, top: 10 },

				expressions:
				[
					{ latex: String.raw`f(x, y) = \frac{1}{20}(x - 3)(y^2 - 4)` },
					{ latex: String.raw`n = 10`, sliderBounds: { min: 1, max: 20, step: 1 } },
					{ latex: String.raw`I = [0, 1, ..., (2n + 1)^2 - 1]`, secret: true },
					{ latex: String.raw`A = [-n, -n + 1, ..., n]`, secret: true },
					{ latex: String.raw`X = A[\mod(I, 2n + 1) + 1]`, secret: true },
					{ latex: String.raw`Y = X[\floor(I / (2n + 1)) + 1]`, secret: true },
					{ latex: String.raw`f(X, Y)(x - X) + Y \{\left|x - X\right| \leq \frac{.3}{\sqrt{1 + f(X, Y)^2}}\}`, color: desmosPurple, secret: true },
				]
			},



			directionField4:
			{
				bounds: { left: -5, right: 5, bottom: -5, top: 5 },

				expressions:
				[
					{ latex: String.raw`f(x, y) = \frac{\sin(y)}{x^2 + 1}` },
					{ latex: String.raw`n = 10`, sliderBounds: { min: 1, max: 20, step: 1 } },
					{ latex: String.raw`I = [0, 1, ..., (2n + 1)^2 - 1]`, secret: true },
					{ latex: String.raw`A = [-n, -n + 1, ..., n]`, secret: true },
					{ latex: String.raw`X = A[\mod(I, 2n + 1) + 1]`, secret: true },
					{ latex: String.raw`Y = X[\floor(I / (2n + 1)) + 1]`, secret: true },
					{ latex: String.raw`f(X, Y)(x - X) + Y \{\left|x - X\right| \leq \frac{.3}{\sqrt{1 + f(X, Y)^2}}\}`, color: desmosPurple, secret: true },
				]
			},
		};

		return data;
	});

	createDesmosGraphs();



	const outputCanvas = $("#vector-field-canvas");

	const applet = new VectorFields({ canvas: outputCanvas });

	applet.run({
		generatingCode: "(1.0, sin(y) / (x*x + 1.0))",
		worldWidth: 8
	});

	applet.pauseWhenOffscreen();



	showPage();
}