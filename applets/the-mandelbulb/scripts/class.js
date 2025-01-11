import anime from "/scripts/anime.js";
import {
	magnitude,
	mat3TimesVector,
	RaymarchApplet
} from "/scripts/applets/raymarchApplet.js";

export class Mandelbulb extends RaymarchApplet
{
	constructor({
		canvas,
	}) {
		const distanceEstimatorGlsl = /* glsl */`
			vec3 z = pos;
			
			float r = length(z);
			float dr = 1.0;
			
			for (int iteration = 0; iteration < 16; iteration++)
			{
				if (r > 16.0)
				{
					break;
				}
				
				float theta = acos(z.z / r);
				
				float phi = atan(z.y, z.x);
				
				dr = pow(r, power - 1.0) * power * dr + 1.0;
				
				theta *= power;
				
				phi *= power;
				
				z = pow(r, power) * vec3(sin(theta)*cos(phi), sin(phi)*sin(theta), cos(theta));
				
				z += mix(pos, c, juliaProportion);
				
				z = rotationMatrix * z;
				
				r = length(z);
			}
			
			return .5 * log(r) * r / dr;
		`;

		const getColorGlsl = /* glsl */`
			vec3 z = pos;
			
			float r = length(z);
			float dr = 1.0;
			
			vec3 color = vec3(1.0, 1.0, 1.0);
			float colorScale = .5;
			
			for (int iteration = 0; iteration < 100; iteration++)
			{
				if (r > 16.0)
				{
					break;
				}
				
				float theta = acos(z.z / r);
				
				float phi = atan(z.y, z.x);
				
				dr = pow(r, power - 1.0) * power * dr + 1.0;
				
				theta *= power;
				
				phi *= power;
				
				z = pow(r, power) * vec3(sin(theta)*cos(phi), sin(phi)*sin(theta), cos(theta));
				
				z += mix(pos, c, juliaProportion);
				
				z = rotationMatrix * z;
				
				r = length(z);
				
				color = mix(color, abs(z / r), colorScale);
				
				colorScale *= .5;
			}
			
			color /= max(max(color.x, color.y), color.z);
			
			return color;
		`;

		const uniformsGlsl = /* glsl */`
			uniform float power;
			uniform vec3 c;
			uniform float juliaProportion;
			uniform mat3 rotationMatrix;
		`;

		const uniforms = {
			power: 8,
			c: [0, 0, 0],
			juliaProportion: 0,
			rotationMatrix: [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
		};

		super({
			canvas,
			resolution: 400,
			distanceEstimatorGlsl,
			getColorGlsl,
			uniformsGlsl,
			uniforms,
			theta: 4.6601,
			phi: 2.272,
			cameraPos: [0.084365, 1.91102, 1.69388],
			lightPos: [-10, 0, 15],
			lightBrightness: 1.25,
		});
	}



	distanceEstimator(x, y, z)
	{
		let mutableZ = [x, y, z];

		let r = 0.0;
		let dr = 1.0;

		const c = this.uniforms.c;
		const juliaProportion = this.uniforms.juliaProportion;
		const power = this.uniforms.power;
		const rotationMatrix = this.uniforms.rotationMatrix;

		for (let iteration = 0; iteration < 16; iteration++)
		{
			r = magnitude(mutableZ);

			if (r > 16.0)
			{
				break;
			}

			let theta = Math.acos(mutableZ[2] / r);

			let phi = Math.atan2(mutableZ[1], mutableZ[0]);

			dr = Math.pow(r, power - 1.0) * power * dr + 1.0;

			theta *= power;

			phi *= power;

			const scaledR = Math.pow(r, power);

			mutableZ[0] = scaledR * Math.sin(theta) * Math.cos(phi)
				+ ((1 - juliaProportion) * x + juliaProportion * c[0]);

			mutableZ[1] = scaledR * Math.sin(theta) * Math.sin(phi)
				+ ((1 - juliaProportion) * y + juliaProportion * c[1]);

			mutableZ[2] = scaledR * Math.cos(theta)
				+ ((1 - juliaProportion) * z + juliaProportion * c[2]);

			// Apply the rotation matrix.
			mutableZ = mat3TimesVector(rotationMatrix, mutableZ);
		}

		return 0.5 * Math.log(r) * r / dr;
	}

	switchBulb(instant)
	{
		const dummy = { t: 0 };

		const oldJuliaProportion = this.uniforms.juliaProportion;
		const newJuliaProportion = this.uniforms.juliaProportion === 0 ? 1 : 0;

		anime({
			targets: dummy,
			t: 1,
			duration: instant ? 10 : 1000,
			easing: "easeOutSine",
			update: () =>
			{
				this.setUniforms({
					juliaProportion:
						(1 - dummy.t) * oldJuliaProportion + dummy.t * newJuliaProportion
				});

				this.needNewFrame = true;
			}
		});
	}

	downloadFrame()
	{
		if (this.uniforms.juliaProportion < .5)
		{
			super.downloadFrame("the-mandelbulb.png");
		}

		else
		{
			super.downloadFrame("a-juliabulb.png");
		}
	}
}