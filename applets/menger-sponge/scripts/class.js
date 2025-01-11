import {
	mat3TimesVector,
	RaymarchApplet
} from "/scripts/applets/raymarchApplet.js";

const changeColorGlsl = /* glsl */`
	vec3 colorAdd = abs(pos / effectiveScale);
	color = normalize(color + colorAdd * colorScale);
	colorScale *= 0.5;
`;

function getDistanceEstimatorGlsl(useForGetColor = false)
{
	// We're very interested in minimizing the number of distances we compute.
	// By taking the absolute value of pos, we limit ourselves to the first octant,
	// and then we can arrange for the xyz values to be in ascending order with some
	// cheeky min and max business. That ensures that the nearest edge block is the one
	// with scale center at (0, 1, 1).
	return /* glsl */`
		pos = abs(pos);
		float maxAbsPos = max(max(pos.x, pos.y), pos.z);
		float minAbsPos = min(min(pos.x, pos.y), pos.z);
		float sumAbsPos = pos.x + pos.y + pos.z;
		pos = vec3(minAbsPos, sumAbsPos - minAbsPos - maxAbsPos, maxAbsPos);

		${useForGetColor ? "vec3 color = vec3(0.25); float colorScale = 0.5;" : ""}

		float totalDistance;
		vec3 totalScale = vec3(1.0, 1.0, 1.0);
		float effectiveScale;

		float invScale = 1.0 / scale;
		float cornerFactor = 2.0 * scale / (scale - 1.0);
		float edgeFactor = 2.0 * scale / (scale - 1.0);

		vec3 cornerScaleCenter = (cornerFactor - 1.0) * vec3(1.0);
		vec3 edgeScaleCenter = vec3(0.0, edgeFactor - 1.0, edgeFactor - 1.0);

		float cornerRadius = 0.5 * (1.0 - invScale);
		float cornerCenter = 0.5 * (1.0 + invScale);

		float edgeLongRadius = invScale;
		float edgeShortRadius = 0.5 * (1.0 - invScale);
		float edgeCenter = 0.5 * (1.0 + invScale);

		for (int iteration = 0; iteration < maxIterations; iteration++)
		{
			if (iteration == iterations)
			{
				break;
			}

			float distanceToCornerX = abs(pos.x - cornerCenter) - cornerRadius;
			float distanceToCornerY = abs(pos.y - cornerCenter) - cornerRadius;
			float distanceToCornerZ = abs(pos.z - cornerCenter) - cornerRadius;
			float distanceToCorner = max(distanceToCornerX, max(distanceToCornerY, distanceToCornerZ));
			
			float distanceToEdgeX = abs(pos.x) - edgeLongRadius;
			float distanceToEdgeY = abs(pos.y - edgeCenter) - edgeShortRadius;
			float distanceToEdgeZ = abs(pos.z - edgeCenter) - edgeShortRadius;
			float distanceToEdge = max(distanceToEdgeX, max(distanceToEdgeY, distanceToEdgeZ));

			if (distanceToCorner < distanceToEdge)
			{
				totalDistance = distanceToCorner;

				if (distanceToCornerX > max(distanceToCornerY, distanceToCornerZ))
				{
					effectiveScale = totalScale.x;
				}

				else if (distanceToCornerY > max(distanceToCornerX, distanceToCornerZ))
				{
					effectiveScale = totalScale.y;
				}

				else
				{
					effectiveScale = totalScale.z;
				}

				// Scale all directions by 2s/(s-1) from (1, 1, 1) * separation.
				pos = cornerFactor * pos - cornerScaleCenter;

				totalScale *= cornerFactor;
			}

			else
			{
				totalDistance = distanceToEdge;
				
				if (distanceToEdgeX > max(distanceToEdgeY, distanceToEdgeZ))
				{
					effectiveScale = totalScale.x;
				}

				else if (distanceToEdgeY > max(distanceToEdgeX, distanceToEdgeZ))
				{
					effectiveScale = totalScale.y;
				}

				else
				{
					effectiveScale = totalScale.z;
				}

				// Scale x by s and y and z by 2s/(s-1) from (0, 1, 1). The second term is equal to
				pos = vec3(1.0 / edgeLongRadius, edgeFactor, edgeFactor) * pos - edgeScaleCenter;

				totalScale *= vec3(1.0 / edgeLongRadius, edgeFactor, edgeFactor);
			}

			${useForGetColor ? changeColorGlsl : ""}

			pos = abs(pos);
			pos = rotationMatrix * pos;
			maxAbsPos = max(max(pos.x, pos.y), pos.z);
			minAbsPos = min(min(pos.x, pos.y), pos.z);
			sumAbsPos = pos.x + pos.y + pos.z;
			pos = vec3(minAbsPos, sumAbsPos - minAbsPos - maxAbsPos, maxAbsPos);
		}
		
		${useForGetColor ? "return abs(color);" : "return totalDistance / effectiveScale;"}
	`;
}


export class MengerSponge extends RaymarchApplet
{
	rotationAngleX = 0;
	rotationAngleY = 0;
	rotationAngleZ = 0;

	constructor({ canvas })
	{
		const distanceEstimatorGlsl = getDistanceEstimatorGlsl();
		const getColorGlsl = getDistanceEstimatorGlsl(true);

		const addGlsl = /* glsl */`
			const int maxIterations = 16;
		`;

		const uniformsGlsl = /* glsl */`
			uniform float scale;
			uniform int iterations;
			uniform mat3 rotationMatrix;
		`;

		const uniforms = {
			scale: 3,
			iterations: 16,
			rotationMatrix: [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
		};

		super({
			canvas,
			distanceEstimatorGlsl,
			getColorGlsl,
			addGlsl,
			uniformsGlsl,
			uniforms,
			cameraPos: [3.5, 0, 0],
			theta: 3 * Math.PI / 2,
			phi: Math.PI / 2,
			stepFactor: .5,
			epsilonScaling: 1.75,
			lightBrightness: 1.75
		});
	}



	distanceEstimator(x, y, z)
	{
		const scale = this.uniforms.scale;
		const iterations = this.uniforms.iterations;

		let mutablePos = [
			Math.abs(x),
			Math.abs(y),
			Math.abs(z)
		];

		let maxAbsPos = Math.max(Math.max(mutablePos[0], mutablePos[1]), mutablePos[2]);
		let minAbsPos = Math.min(Math.min(mutablePos[0], mutablePos[1]), mutablePos[2]);
		let sumAbsPos = mutablePos[0] + mutablePos[1] + mutablePos[2];
		mutablePos = [minAbsPos, sumAbsPos - minAbsPos - maxAbsPos, maxAbsPos];

		let totalDistance;
		const totalScale = [1, 1, 1];
		let effectiveScale;

		const invScale = 1 / scale;
		const cornerFactor = 2 * scale / (scale - 1);
		const edgeFactor = 2 * scale / (scale - 1);

		const cornerScaleCenter = [
			cornerFactor - 1,
			cornerFactor - 1,
			cornerFactor - 1
		];
		
		const edgeScaleCenter = [0, edgeFactor - 1, edgeFactor - 1];

		const cornerRadius = 0.5 * (1 - invScale);
		const cornerCenter = 0.5 * (1 + invScale);

		const edgeRadius = 0.5 * (1 - invScale);
		const edgeCenter = 0.5 * (1 + invScale);

		for (let iteration = 0; iteration < iterations; iteration++)
		{
			const distanceToCornerX = Math.abs(mutablePos[0] - cornerCenter) - cornerRadius;
			const distanceToCornerY = Math.abs(mutablePos[1] - cornerCenter) - cornerRadius;
			const distanceToCornerZ = Math.abs(mutablePos[2] - cornerCenter) - cornerRadius;
			const distanceToCorner = Math.max(
				distanceToCornerX,
				Math.max(distanceToCornerY, distanceToCornerZ)
			);
			
			const distanceToEdgeX = mutablePos[0] - invScale;
			const distanceToEdgeY = Math.abs(mutablePos[1] - edgeCenter) - edgeRadius;
			const distanceToEdgeZ = Math.abs(mutablePos[2] - edgeCenter) - edgeRadius;
			const distanceToEdge = Math.max(
				distanceToEdgeX,
				Math.max(distanceToEdgeY, distanceToEdgeZ)
			);

			if (distanceToCorner < distanceToEdge)
			{
				totalDistance = distanceToCorner;

				if (distanceToCornerX > Math.max(distanceToCornerY, distanceToCornerZ))
				{
					effectiveScale = totalScale[0];
				}

				else if (distanceToCornerY > Math.max(distanceToCornerX, distanceToCornerZ))
				{
					effectiveScale = totalScale[1];
				}

				else
				{
					effectiveScale = totalScale[2];
				}

				// Scale all directions by 2s/(s-1) from (1, 1, 1) * separation.
				mutablePos = [
					cornerFactor * mutablePos[0] - cornerScaleCenter[0],
					cornerFactor * mutablePos[1] - cornerScaleCenter[1],
					cornerFactor * mutablePos[2] - cornerScaleCenter[2]
				];

				totalScale[0] *= cornerFactor;
				totalScale[1] *= cornerFactor;
				totalScale[2] *= cornerFactor;
			}

			else
			{
				totalDistance = distanceToEdge;
				
				if (distanceToEdgeX > Math.max(distanceToEdgeY, distanceToEdgeZ))
				{
					effectiveScale = totalScale[0];
				}

				else if (distanceToEdgeY > Math.max(distanceToEdgeX, distanceToEdgeZ))
				{
					effectiveScale = totalScale[1];
				}

				else
				{
					effectiveScale = totalScale[2];
				}

				mutablePos = [
					scale * mutablePos[0] - edgeScaleCenter[0],
					edgeFactor * mutablePos[1] - edgeScaleCenter[1],
					edgeFactor * mutablePos[2] - edgeScaleCenter[2]
				];

				totalScale[0] *= scale;
				totalScale[1] *= edgeFactor;
				totalScale[2] *= edgeFactor;
			}

			mutablePos = [
				Math.abs(mutablePos[0]),
				Math.abs(mutablePos[1]),
				Math.abs(mutablePos[2])
			];

			mutablePos = mat3TimesVector(
				this.uniforms.rotationMatrix,
				mutablePos
			);

			maxAbsPos = Math.max(Math.max(mutablePos[0], mutablePos[1]), mutablePos[2]);
			minAbsPos = Math.min(Math.min(mutablePos[0], mutablePos[1]), mutablePos[2]);
			sumAbsPos = mutablePos[0] + mutablePos[1] + mutablePos[2];
			mutablePos = [minAbsPos, sumAbsPos - minAbsPos - maxAbsPos, maxAbsPos];
		}

		return Math.abs(totalDistance) / effectiveScale;
	}
}