/** Explicit KHOSAN-native coordinate adapter. Never silently mutate source IR. */
function vec3(v){if(!Array.isArray(v)||v.length!==3||!v.every(x=>typeof x==='number'&&Number.isFinite(x)))throw Error('expected finite [x,y,z] vector');return v}
export function threeYUpMetersToKhosanZUpCm(v){const [x,y,z]=vec3(v);return [x*100,-z*100,y*100]}
export function khosanZUpCmToThreeYUpMeters(v){const [x,y,z]=vec3(v);return [x/100,z/100,-y/100]}
export function threeYUpSizeMetersToKhosanSizeCm(v){const [w,h,d]=vec3(v);if([w,h,d].some(x=>x<=0))throw Error('size must be positive');return [w*100,d*100,h*100]}