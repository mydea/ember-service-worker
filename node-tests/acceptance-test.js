var assert = require('chai').assert;
var fs = require('fs');
var path = require('path');
var rimraf = require('rimraf').sync;
var childProcess = require('child_process');

var spawn = childProcess.spawn;
var spawnSync = childProcess.spawnSync;

var emberCLIPath = path.resolve(__dirname, './fixtures/simple-app/node_modules/ember-cli/bin/ember');

describe('Acceptance Tests', function() {
  this.timeout(120000);
  var fixturePath = path.resolve(__dirname, './fixtures/simple-app');

  context('A Simple App', function() {

    function dist(file) {
      return path.join(fixturePath, 'dist', file);
    }

    before(function() {
      runEmberCommand(fixturePath, ['build']);
    });

    after(function() {
      cleanup(fixturePath);
    });

    it('produces a sw.js file', function() {
      exists(dist('sw.js'));
    });

    it('produces a sw-registration file, which is loaded in index.html', function() {
      exists(dist('sw-registration.js'));
      contains(dist('index.html'), '<script src="/sw-registration.js"></script>');
    });

    it('transpiles and concatenates (rollup) all files in a plugin into sw.js', function() {
      contains(dist('sw.js'), "self.hello = 'Hello from Ember Service Worker Test';");
    });

    it('transpiles and concatenates (rollup) all registration files in a plugin into sw-registration.js', function() {
      contains(dist('sw-registration.js'), "self.hello = 'Hello from Ember Service Worker Test';");
    });
  });

  context('SW', function() {
    let results;
    let emberServer;

    before(function(done) {
      emberServer = runEmberCommandAsync(fixturePath, ['server', '--port', '4242']);

      emberServer.stdout.on('data', (data) => {
        if (data.indexOf('Build successful') !== -1) {
          spawnSync('lighthouse', [
            '--output', 'json',
            '--output-path', `${__dirname}/lighthouse-results.json`,
            '--config-path', `${__dirname}/fixtures/lighthouse-config.json`,
            'http://localhost:4242']);

          results = require('./lighthouse-results.json');
          done();
        }
      });
    });

    after(function() {
      emberServer.kill();
      fs.unlinkSync(`${__dirname}/lighthouse-results.json`);
      cleanup(fixturePath);
    });

    it('is registered', function() {
      assert.ok(results.audits['service-worker'].score);
    });
  });
});

function runEmberCommand(packagePath, command) {
  var result = spawnSync(emberCLIPath, command, {
    cwd: packagePath
  });

  if (result.status !== 0) {
    throw new Error(result.stderr.toString());
  }
}

function runEmberCommandAsync(packagePath, command) {
  return spawn(emberCLIPath, command, {
    cwd: packagePath
  });
}

function cleanup(packagePath) {
  rimraf(path.join(packagePath, 'dist'));
  rimraf(path.join(packagePath, 'tmp'));
}

function exists(path) {
  assert.ok(fs.existsSync(path), path + ' exists');
}

function contains(path, content) {
  assert.ok(fs.readFileSync(path).toString().indexOf(content) > -1, path + ' contains ' + content);
}
