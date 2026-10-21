// Writes .br and .gz next to every text file of the build, so Caddy serves them precompressed
// (file_server precompressed) instead of compressing on every request. Usage: node precompress.mjs <dist>
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { brotliCompressSync, constants, gzipSync } from 'node:zlib';

const TEXT = /\.(html|css|js|mjs|svg|xml|json|txt|webmanifest)$/;
let n = 0;
const walk = (dir) => {
	for (const name of readdirSync(dir)) {
		const p = join(dir, name);
		if (statSync(p).isDirectory()) walk(p);
		else if (TEXT.test(name) && statSync(p).size > 512) {
			const buf = readFileSync(p);
			writeFileSync(`${p}.br`, brotliCompressSync(buf, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }));
			writeFileSync(`${p}.gz`, gzipSync(buf, { level: 9 }));
			n++;
		}
	}
};
walk(process.argv[2] ?? 'dist');
console.log(`precompressed ${n} files`);
