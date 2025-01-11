import { applet, initializeApplet } from "../index.js";
import { GroundAndSphere } from "/applets/raymarching-fundamentals/scripts/groundAndSphere.js";

const uniforms = [
	"modPosAmount",
	"showRoomsAmount",
];

async function reset({ slide, forward, duration })
{
	await initializeApplet({
		Class: GroundAndSphere,
		slide,
		duration,
		resolution: 500
	});

	[
		"showSphereAmount",
		"lightAmount",
		"ambientOcclusionAmount",
		"groundTextureAmount",
		"fogAmount",
		"pointLightAmount",
		"softShadowAmount",
		"reflectivityAmount",
	].forEach(name => applet.setUniforms({ [name]: 1 }));

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

export const foldingSpaceBuilds =
{
	reset,
	...builds
};