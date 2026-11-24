import fs from 'fs';
import { wordVisemes } from '../../../src/lib/services/animation/classic/visemes.js';
const [text, wordsF, envF, fps] = process.argv.slice(2);
const env = JSON.parse(fs.readFileSync(envF)); const words = JSON.parse(fs.readFileSync(wordsF));
console.log(JSON.stringify(wordVisemes(text, words, env, +fps)));
