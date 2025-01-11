import { applet, initializeApplet } from "../index.js";
import { GroundAndSphere } from "/applets/raymarching-fundamentals/scripts/groundAndSphere.js";

const uniforms = [
	"showSphereAmount",
];

async function reset({ slide, forward, duration })
{
	await initializeApplet({
		Class: GroundAndSphere,
		slide,
		duration
	});

	if (!forward)
	{
		for (const name of uniforms)
		{
			applet.setUniforms({ [name]: 1 });
		}
	}
}

const builds = Object.fromEntries(
	uniforms.map(
		(name, index) => [
			index,
			({ forward, duration }) => applet.animateUniform({
				name,
				value: forward ? 1 : 0,
				duration
			})
		]
	)
);

export const groundAndSphereBuilds =
{
	reset,
	...builds
};