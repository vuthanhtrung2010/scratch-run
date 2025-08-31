// Suppress all warnings
process.removeAllListeners('warning');

import fs from 'fs';
import minimist from 'minimist';
import scratchVMImport from 'scratch-vm';
import KattioImport from './kattio';

interface Argv {
  help?: boolean;
  version?: boolean;
  check?: boolean;
  'buffer-stdout'?: boolean;
  'print-generated-js'?: boolean;
  _: string[];
}

function writeStdoutSync(text: string): void {
  fs.writeSync(process.stdout.fd, text);
}

function writeStderrSync(text: string): void {
  fs.writeSync(process.stderr.fd, text);
}

const argv: Argv = minimist(process.argv.slice(2), {
  boolean: ['help', 'version', 'check', 'buffer-stdout', 'print-generated-js']
});

if (argv.version) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { version } = require('../package.json');
  writeStdoutSync(version + '\n');
  process.exit(0);
}

if (argv._.length == 0 || argv.help) {
  writeStdoutSync(`Usage: scratch-run project-file [OPTIONS]
Options:
  --help                  print this message
  --version               print the version
  --check                 validate project file
  --buffer-stdout         buffer stdout for better performance
  --print-generated-js    print the generated JavaScript code
`);
  process.exit(0);
}

const scratchVM = scratchVMImport as any;
const Kattio = KattioImport as any;

function construct_vm(): any {
  const vm = new scratchVM();
  vm.convertToPackagedRuntime();
  vm.setTurboMode(true);
  vm.setFramerate(250);

  // Block loading extensions (e.g., music)
  vm.extensionManager.loadExtensionIdSync =
    vm.extensionManager.loadExtensionURL = (id: string) => {
      writeStderrSync(
        'Not a valid Scratch file: Can not use extension ' + id + '\n'
      );
      process.exit(1);
    };

  return vm;
}

function check_scratch_file(filename: string): void {
  const vm = construct_vm();
  fs.readFile(filename, function (err: NodeJS.ErrnoException | null, data: Buffer) {
    if (err) {
      writeStderrSync(err + '\n');
      process.exit(1);
    }

    vm.loadProject(data)
      .then(() => {
        process.exit(0);
      })
      .catch(function (err: Error) {
        writeStderrSync('Not a valid Scratch file: ' + err + '\n');
        process.exit(1);
      });
  });
}

function print_generated_js(filename: string): void {
  const vm = construct_vm();

  const generatedJS: string[] = [];
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  (require('scratch-vm/src/compiler/jsgen') as any).testingApparatus = {
    report: (jsgen: any, factorySource: string) => {
      const targetName = jsgen.target.getName();
      const scriptName = jsgen.script.procedureCode || 'script';
      generatedJS.push(`// ${targetName} ${scriptName}\n${factorySource}`);
    }
  };

  const errors: { target: any; error: string }[] = [];
  vm.on('COMPILE_ERROR', (target: any, error: string) => {
    errors.push({ target, error });
  });

  fs.readFile(filename, function (err: NodeJS.ErrnoException | null, data: Buffer) {
    if (err) {
      writeStderrSync(err + '\n');
      process.exit(1);
    }

    vm.loadProject(data)
      .then(() => {
        vm.runtime.precompile();

        let result = '';
        if (errors.length) {
          result += '// Errors:\n';
          result += errors.map((i) => `// ${i.target.getName()}: ${i.error}\n`);
          result += '\n';
        }
        result += generatedJS.join('\n\n');
        result += '\n';
        writeStdoutSync(result);
      })
      .catch(function (err: Error) {
        writeStderrSync('scratch-vm encountered an error: ' + err + '\n');
        process.exit(1);
      });
  });
}

function run_scratch_file(filename: string): void {
  const vm = construct_vm();

  // _scratch_run_* are called from the generated code by scratch-vm's compiler
  let stdoutBuffer = '';
  if (argv['buffer-stdout']) {
    vm.runtime._scratch_run_say = function (text: string) {
      stdoutBuffer += text + '\n';
    };
    vm.runtime._scratch_run_think = function (text: string) {
      stdoutBuffer += text;
    };
  } else {
    vm.runtime._scratch_run_say = function (text: string) {
      process.stdout.write(text + '\n');
    };
    vm.runtime._scratch_run_think = function (text: string) {
      process.stdout.write(text);
    };
  }
  vm.runtime._scratch_run_ask = function (question: string) {
    try {
      if (question === 'read_token') {
        return Kattio.nextToken();
      } else {
        return Kattio.nextLine();
      }
    } catch (e: any) {
      writeStderrSync(
        'scratch-vm encountered an error: Could not read input: ' +
          e.message +
          '\n'
      );
      process.exit(1);
    }
  };

  vm.runtime.on('PROJECT_RUN_STOP', function () {
    vm.runtime.quit();
    process.stdout.write(stdoutBuffer, () => process.exit(0));
  });

  fs.readFile(filename, function (err: NodeJS.ErrnoException | null, data: Buffer) {
    if (err) {
      writeStderrSync(err + '\n');
      process.exit(1);
    }

    vm.loadProject(data)
      .then(() => {
        for (const target of vm.runtime.targets as any[]) {
          target.setVisible(false);
        }
        vm.runtime.precompile();
        vm.start();
        vm.greenFlag();
      })
      .catch(function (err: Error) {
        writeStderrSync('scratch-vm encountered an error: ' + err + '\n');
        process.exit(1);
      });
  });
}

const filename = argv._[0];
if (typeof filename !== 'string') {
  writeStderrSync('Error: No project file specified.\n');
  process.exit(1);
}

if (argv.check) {
  check_scratch_file(filename);
} else if (argv['print-generated-js']) {
  print_generated_js(filename);
} else {
  run_scratch_file(filename);
}

export {};
