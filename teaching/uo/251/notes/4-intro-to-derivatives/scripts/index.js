import { showPage } from "../../../../../../scripts/src/loadPage.js";
import {
	createDesmosGraphs,
	desmosBlue,
	desmosPurple,
	setGetDesmosData
} from "/scripts/src/desmos.js";

export default function()
{
	setGetDesmosData(() =>
	{
		const data =
		{
			secantLines:
			{
				bounds: { left: -2.5, right: 2.5, bottom: -1.5, top: 3.5 },

				expressions:
				[
					{ latex: String.raw`f(x) = x^2`, color: desmosPurple },
					{ latex: String.raw`a = 1` },
					{ latex: String.raw`h = .1`, sliderBounds: { min: 0, max: 10 } },
					{ latex: String.raw`m = \frac{f(a + h) - f(a)}{h}`, secret: true },
					{ latex: String.raw`(a, f(a))`, color: desmosBlue, secret: true },
					{ latex: String.raw`(a + h, f(a + h))`, color: desmosBlue, secret: true },
					{ latex: String.raw`y - f(a) = m(x - a)`, color: desmosBlue, secret: true },
				]
			},



			tangentLines:
			{
				bounds: { left: -2.5, right: 2.5, bottom: -1.5, top: 3.5 },

				expressions:
				[
					{ latex: String.raw`f(x) = x^2`, color: desmosPurple },
					{ latex: String.raw`a = 1` },
					{ latex: String.raw`(a, f(a))`, color: desmosBlue, secret: true },
					{ latex: String.raw`y - f(a) = f'(a)(x - a)`, color: desmosBlue, secret: true },
				]
			},



			derivativeExample:
			{
				bounds: { left: -2.5, right: 2.5, bottom: -1.5, top: 3.5 },

				expressions:
				[
					{ latex: String.raw`f(x) = x^2`, color: desmosPurple },
					{ latex: String.raw`f'(x)`, color: desmosBlue },
				]
			},



			derivativeExample2:
			{
				bounds: { left: -5, right: 5, bottom: -5, top: 5 },

				expressions:
				[
					{ latex: String.raw`f(x) = \sin(x) + 1 - .1x^2`, color: desmosPurple },
					{ latex: String.raw`f'(x)`, color: desmosBlue, hidden: true },
				]
			},



			derivativeExample3:
			{
				bounds: { left: -1.5, right: 3, bottom: -2, top: 2.5 },

				expressions:
				[
					{ latex: String.raw`f(x) = x^3 + 1 - 2x^2`, color: desmosPurple },
				]
			},



			derivativeExample4:
			{
				bounds: { left: -5, right: 5, bottom: -5, top: 5 },

				expressions:
				[
					{ latex: String.raw`f(x) = \left|x\right|`, color: desmosPurple },
				]
			},
		};

		return data;
	});

	createDesmosGraphs();

	showPage();
}