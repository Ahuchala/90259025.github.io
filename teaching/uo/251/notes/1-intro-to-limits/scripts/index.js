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
			velocityExample:
			{
				bounds: { left: -10, right: 10, bottom: -10, top: 10 },

				expressions:
				[
					{ latex: String.raw`s(t) = 2t`, color: desmosPurple },
					{ latex: String.raw`v(t) = 2`, color: desmosBlue },
				]
			},



			secantLines:
			{
				bounds: { left: -2.5, right: 2.5, bottom: -2.5, top: 2.5 },

				expressions:
				[
					{ latex: String.raw`f(t) = t^2`, color: desmosPurple },
					{ latex: String.raw`a = 0`, sliderBounds: { min: -2, max: 2 } },
					{ latex: String.raw`b = 1`, sliderBounds: { min: -2, max: 2 } },
					{ latex: String.raw`(a, f(a))`, color: desmosBlue, secret: true },
					{ latex: String.raw`(b, f(b))`, color: desmosBlue, secret: true },
					{ latex: String.raw`y - f(a) = \frac{f(b) - f(a)}{b - a}(x - a)`, color: desmosBlue, secret: true },
				]
			},



			tangentLines:
			{
				bounds: { left: -2.5, right: 2.5, bottom: -2.5, top: 2.5 },

				expressions:
				[
					{ latex: String.raw`f(t) = t^2`, color: desmosPurple },
					{ latex: String.raw`a = 0`, sliderBounds: { min: -2, max: 2 } },
					{ latex: String.raw`(a, f(a))`, color: desmosBlue, secret: true },
					{ latex: String.raw`y - f(a) = f'(a)(x - a)`, color: desmosBlue, secret: true },
				]
			},



			tangentLines2:
			{
				bounds: { left: -2.5, right: 2.5, bottom: -2.5, top: 2.5 },

				expressions:
				[
					{ latex: String.raw`f(t) = t^2`, color: desmosPurple, hidden: true },
					{ latex: String.raw`g(h) = \frac{f(h) - f(0)}{h - 0}`, color: desmosBlue },

					{ latex: String.raw`(0, f'(0))`, color: desmosBlue, pointStyle: "OPEN", secret: true },
				]
			},



			limitExample:
			{
				bounds: { left: -20, right: 20, bottom: -2, top: 2 },

				expressions:
				[
					{ latex: String.raw`f(x) = \frac{\sin(x)}{x}`, color: desmosPurple },
					{ latex: String.raw`(0, 1)`, color: desmosPurple, pointStyle: "OPEN" },
				]
			},



			limitExample2:
			{
				bounds: { left: -3, right: 3, bottom: -10, top: 10 },

				expressions:
				[
					{ latex: String.raw`g(x) = x^3 - x`, color: desmosPurple, secret: true, hidden: true },
					{ latex: String.raw`g(x)`, color: desmosPurple },
					{ latex: String.raw`(1, 0)`, color: desmosPurple, pointStyle: "OPEN", secret: true },
					{ latex: String.raw`(1, 2)`, color: desmosPurple, secret: true },
				]
			},



			dneLimit:
			{
				bounds: { left: -.5, right: .5, bottom: -1.5, top: 1.5 },

				expressions:
				[
					{ latex: String.raw`f(x) = \sin(\frac{1}{x})`, color: desmosPurple }
				]
			},



			dneLimit2:
			{
				bounds: { left: -5, right: 5, bottom: -2, top: 2 },

				expressions:
				[
					{ latex: String.raw`f(x) = \frac{\left|x - 2\right|}{x - 2}`, color: desmosPurple, secret: true, hidden: true },
					{ latex: String.raw`f(x)`, color: desmosPurple },
					{ latex: String.raw`(2, -1)`, color: desmosPurple, pointStyle: "OPEN", secret: true },
					{ latex: String.raw`(2, 1)`, color: desmosPurple, pointStyle: "OPEN", secret: true },
				]
			},



			infiniteLimit:
			{
				bounds: { left: -5, right: 5, bottom: -5, top: 5 },

				expressions:
				[
					{ latex: String.raw`f(x) = \frac{1}{x^2}`, color: desmosPurple }
				]
			},



			complicatedLimit:
			{
				bounds: { left: -5, right: 5, bottom: -5, top: 5 },

				expressions:
				[
					{ latex: String.raw`f(x) = \{x \leq -3: x, -3 \leq x \leq 0: \frac{1}{27}x^3, 0 \leq x \leq 2: \frac{1}{x - 1} + 1, 2 \leq x: x - 2\}`, color: desmosPurple, secret: true, hidden: true },
					{ latex: String.raw`f(x)`, color: desmosPurple },
					{ latex: String.raw`(-3, -1)`, color: desmosPurple, secret: true },
					{ latex: String.raw`(-3, -3), (0, 0), (2, 0), (2, 2)`, color: desmosPurple, pointStyle: "OPEN", secret: true },
				]
			},
		};

		return data;
	});

	createDesmosGraphs();

	showPage();
}