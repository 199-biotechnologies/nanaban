import { Command } from 'commander';
import { runGenerate } from './commands/generate.js';
import { runEdit } from './commands/edit.js';
import { runAuthStatus, runAuthSet } from './commands/auth.js';

const VERSION = '3.0.0';

const program = new Command();

program
  .name('nanaban')
  .description('Nano Banana image generation CLI')
  .version(VERSION, '-v, --version')
  .enablePositionalOptions()
  .argument('[prompt]', 'image generation prompt')
  .option('-o, --output <file>', 'output file path (auto-generated from prompt if omitted)')
  .option('--ar <ratio>', 'aspect ratio: 1:1, 16:9, 9:16, 4:3, 3:4, square, wide, tall', '1:1')
  .option('--size <size>', 'image size: 1k, 2k, 4k', '1k')
  .option('--pro', 'use Nano Banana Pro instead of NB2', false)
  .option('--neg <text>', 'negative prompt (what to avoid)')
  .option('-r, --ref <file...>', 'reference image path(s)')
  .option('--open', 'open in default viewer after generation', false)
  .option('--json', 'structured JSON output for LLM/script piping', false)
  .option('--quiet', 'suppress non-essential output', false)
  .action(async (prompt: string | undefined, opts) => {
    if (!prompt) {
      program.help();
      return;
    }
    await runGenerate(prompt, opts);
  });

const editCmd = new Command('edit')
  .description('edit an existing image')
  .argument('<image>', 'path to the image to edit')
  .argument('<prompt>', 'edit instructions')
  .option('-o, --output <file>', 'output file path')
  .option('--ar <ratio>', 'aspect ratio', '1:1')
  .option('--size <size>', 'image size', '1k')
  .option('--json', 'JSON output', false)
  .option('--quiet', 'suppress output', false)
  .option('--open', 'open after generation', false)
  .action(async (image: string, prompt: string, opts) => {
    await runEdit(image, prompt, opts);
  });

const authCmd = new Command('auth')
  .description('manage authentication')
  .option('--json', 'JSON output', false)
  .action(async (opts) => {
    await runAuthStatus(opts.json);
  });

authCmd
  .command('set <key>')
  .description('store API key in ~/.nanaban/config.json')
  .option('--json', 'JSON output', false)
  .action(async (key: string, opts) => {
    await runAuthSet(key, opts.json);
  });

program.addCommand(editCmd);
program.addCommand(authCmd);

program.parseAsync().catch((err) => {
  process.stderr.write(`Error: ${err.message}\n`);
  process.exit(1);
});
