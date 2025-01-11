import { showPage } from "../../../../../../scripts/src/loadPage.js";
import {
	createDesmosGraphs,
	desmosBlue,
	desmosPurple,
	desmosRed,
	setGetDesmosData
} from "/scripts/src/desmos.js";

export default function()
{
	setGetDesmosData(() =>
	{
		const data =
		{
			alternatingHarmonicSeries:
			{
				bounds: { left: .9, right: 2.1, bottom: -.1, top: 1.1 },

				expressions:
				[
					{ latex: String.raw`n = 1`, sliderBounds: { min: 1, max: 7, step: 1 } },

					{ latex: String.raw`f(x) = \frac{1}{x} \{ 1 \leq x \leq 2 \}`, color: desmosPurple, secret: true },

					{ latex: String.raw`0 \leq y \leq 1 \{1 \leq x \leq 2\} \{n = 1\}`, color: desmosBlue, secret: true },
					{ latex: String.raw`x = [1, 2] \{0 \leq y \leq 1\}`, color: desmosBlue, secret: true },
					{ latex: String.raw`y = [0, 1] \{1 \leq x \leq 2\}`, color: desmosBlue, secret: true },
					{ latex: String.raw`( \frac{3}{2}, \frac{1}{2} ) \{n = 1\}`, color: desmosBlue, label: "1", showLabel: true, labelSize: "large", hidden: true, secret: true },

					{ latex: String.raw`0 \leq y \leq 1 \{1 \leq x \leq \frac{3}{2}\} \{n = [2, 3]\}`, color: desmosBlue, secret: true },
					{ latex: String.raw`x = \frac{3}{2} \{0 \leq y \leq 1\} \{n = [2, 3]\}`, color: desmosBlue, secret: true },
					{ latex: String.raw`( \frac{7}{4}, \frac{1}{2} ) \{n = 2\}`, color: desmosRed, label: "-1/2", showLabel: true, labelSize: "large", hidden: true, secret: true },
					{ latex: String.raw`0 \leq y \leq \frac{2}{3} \{\frac{3}{2} \leq x \leq 2\} \{n = [3, 4, 5]\}`, color: desmosBlue, secret: true },
					{ latex: String.raw`( \frac{7}{4}, \frac{1}{3} ) \{n = 3\}`, color: desmosBlue, label: "+1/3", showLabel: true, labelSize: "large", hidden: true, secret: true },

					{ latex: String.raw`0 \leq y \leq 1 \{1 \leq x \leq \frac{5}{4}\} \{n = [4, 5, 6, 7]\}`, color: desmosBlue, secret: true },
					{ latex: String.raw`x = \frac{5}{4} \{0 \leq y \leq 1\} \{n = [4, 5, 6, 7]\}`, color: desmosBlue, secret: true },
					{ latex: String.raw`x = \frac{3}{2} \{0 \leq y \leq 1\} \{n = 4\}`, color: desmosBlue, secret: true },
					{ latex: String.raw`( \frac{11}{8}, \frac{1}{2} ) \{n = 4\}`, color: desmosRed, label: "-1/4", showLabel: true, labelSize: "large", hidden: true, secret: true },
					{ latex: String.raw`0 \leq y \leq \frac{4}{5} \{\frac{5}{4} \leq x \leq \frac{3}{2}\} \{n = [5, 6, 7]\}`, color: desmosBlue, secret: true },
					{ latex: String.raw`x = \frac{3}{2} \{0 \leq y \leq \frac{4}{5}\} \{n = [5, 6, 7]\}`, color: desmosBlue, secret: true },
					{ latex: String.raw`( \frac{11}{8}, \frac{2}{5} ) \{n = 5\}`, color: desmosBlue, label: "+1/5", showLabel: true, labelSize: "large", hidden: true, secret: true },
					{ latex: String.raw`0 \leq y \leq \frac{2}{3} \{\frac{3}{2} \leq x \leq \frac{7}{4}\} \{n = [6, 7]\}`, color: desmosBlue, secret: true },
					{ latex: String.raw`x = \frac{7}{4} \{0 \leq y \leq \frac{2}{3}\} \{n = [6, 7]\}`, color: desmosBlue, secret: true },
					{ latex: String.raw`y = \frac{2}{3} \{\frac{7}{4} \leq x \leq 2\} \{n = 6\}`, color: desmosBlue, secret: true },
					{ latex: String.raw`( \frac{15}{8}, \frac{1}{3} ) \{n = 6\}`, color: desmosRed, label: "-1/6", showLabel: true, labelSize: "large", hidden: true, secret: true },
					{ latex: String.raw`0 \leq y \leq \frac{4}{7} \{\frac{7}{4} \leq x \leq 2\} \{n = 7\}`, color: desmosBlue, secret: true },
					{ latex: String.raw`( \frac{15}{8}, \frac{2}{7} ) \{n = 7\}`, color: desmosBlue, label: "+1/7", showLabel: true, labelSize: "large", hidden: true, secret: true }
				]
			},



			alternatingHarmonicSeries2:
			{
				bounds: { left: -.25, right: 1.25, bottom: -.75, top: .75 },

				expressions:
				[
					{ latex: String.raw`M = 1`, sliderBounds: { min: 0, max: 100, step: 1 } },

					{ latex: String.raw`a(n) = \frac{(-1)^{n + 1}}{n}`, hidden: true },

					{ latex: String.raw`m = [0, ..., M]`, secret: true },
					{ latex: String.raw`s(n) = \{n = 0: 0, n > 0: \sum_{k = 1}^n a(k) \}`, hidden: true, secret: true },
					{ latex: String.raw`c(n) = \frac{s(n - 1) + s(n)}{2}`, hidden: true, secret: true },
					{ latex: String.raw`r(n) = \left| s(n) - c(n) \right|`, hidden: true, secret: true },
					{ latex: String.raw`(x - c(2m + 1))^2 + y^2 = r(2m + 1)^2 \{y \geq 0\}`, color: desmosBlue, secret: true },
					{ latex: String.raw`(x - c(2m))^2 + y^2 = r(2m)^2 \{y \leq 0\}`, color: desmosBlue, secret: true },
					{ latex: String.raw`(s(10000), 0)`, color: desmosRed, secret: true },
				]
			},



			alternatingHarmonicSeries3:
			{
				bounds: { left: -.25, right: 1.25, bottom: -.75, top: .75 },

				expressions:
				[
					{ latex: String.raw`M = 1`, sliderBounds: { min: 0, max: 100, step: 1 } },

					{ latex: String.raw`a(n) = \frac{(-1)^{n + 1}}{n}`, hidden: true },

					{ latex: String.raw`m = [0, ..., M]`, secret: true },
					{ latex: String.raw`s(n) = \{n = 0: 0, n > 0: \sum_{k = 1}^n a(k) \}`, hidden: true, secret: true },
					{ latex: String.raw`c(n) = \frac{s(n - 1) + s(n)}{2}`, hidden: true, secret: true },
					{ latex: String.raw`r(n) = \left| s(n) - c(n) \right|`, hidden: true, secret: true },
					{ latex: String.raw`(x - c(2m + 1))^2 + y^2 = r(2m + 1)^2 \{y \geq 0\}`, color: desmosBlue, secret: true },
					{ latex: String.raw`(x - c(2m))^2 + y^2 = r(2m)^2 \{y \leq 0\}`, color: desmosBlue, secret: true },
					{ latex: String.raw`(s(10000), 0)`, color: desmosRed, secret: true },
				]
			},
		};

		return data;
	});

	createDesmosGraphs();

	showPage();
}